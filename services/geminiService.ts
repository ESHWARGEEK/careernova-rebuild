import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, CareerPath, InterviewTurn, RoadmapResult, ResumeSuggestionsResult, UpdatedAtsScoreResult, JobListing, StructuredResume, LinkedInConnectionsResult, CareerTrajectoryResult, JobFitAnalysisResult, MessageGoal, LinkedInConnection, SuggestedNextStep, LinkedInOptimizationResult, VideoPitchFeedback, InterviewReportResult, UserVibeProfile, CompanyVibeAnalysisResult } from "../types";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

// FIX: Ensure API_KEY is checked before use.
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set. Please ensure it is configured in your environment.");
}

// FIX: Initialize the GoogleGenAI client with the API key from environment variables.
export const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// Helper function for retrying API calls on 503/429 errors
async function generateWithRetry(model: string, params: any, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            return await ai.models.generateContent({ model, ...params });
        } catch (e: any) {
            // Check for 503 (Service Unavailable) or 429 (Too Many Requests)
            const isTransientError = e.message?.includes('503') || e.message?.includes('429') || (e.status === 503) || (e.status === 429);
            
            if (isTransientError && i < retries - 1) {
                console.warn(`Gemini API ${model} hit error ${e.message}. Retrying... (${i + 1}/${retries})`);
                // Exponential backoff: 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
                continue;
            }
            throw e;
        }
    }
}

export const getTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let textContent = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(item => ('str' in item ? item.str : '')).join('\n');
        }
        return textContent;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        return value;
    } else if (file.type === 'text/plain') {
        return file.text();
    } else {
        if (file.type.startsWith('text/')) {
            return file.text();
        }
        throw new Error(`Unsupported file type for text extraction: ${file.type}. Please use PDF, DOCX, or TXT.`);
    }
};

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "A 2-3 sentence professional summary based on the resume." },
        atsScore: { type: Type.INTEGER, description: "An estimated Applicant Tracking System (ATS) score from 0 to 100." },
        strengths: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    point: { type: Type.STRING, description: "A key strength or skill." },
                    explanation: { type: Type.STRING, description: "A brief explanation of why this is a strength." }
                }
            }
        },
        weaknesses: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    point: { type: Type.STRING, description: "A potential weakness or area for improvement." },
                    explanation: { type: Type.STRING, description: "A brief explanation and suggestion for improvement." }
                }
            }
        },
        suggestedRoles: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    role: { type: Type.STRING, description: "A suggested job role." },
                    matchPercentage: { type: Type.INTEGER, description: "A percentage match score for this role." },
                    reasoning: { type: Type.STRING, description: "Reasoning for why this role is a good fit." },
                    salaryRange: { type: Type.STRING, description: "Estimated annual salary range (e.g. '$80k - $120k') in USD." },
                    marketDemand: { type: Type.STRING, description: "The current market demand for this role (e.g., 'High', 'Medium', 'Growing')." },
                    growthOutlook: { type: Type.STRING, description: "A brief phrase describing future growth potential (e.g. '15% growth expected over next decade')." }
                }
            }
        }
    }
};

export const analyzeResume = async (file: File): Promise<AnalysisResult> => {
    const resumeText = await getTextFromFile(file);
    if (!resumeText.trim()) {
        throw new Error("Could not extract any text from the resume file. It might be an image-based file or empty.");
    }

    const prompt = `Analyze the provided resume text and return a comprehensive career analysis. Focus on identifying key strengths, areas for improvement, and suggesting suitable job roles. For each suggested role, provide an estimated salary range, market demand, and future growth outlook. Provide an estimated ATS score. Here is the resume text:\n\n${resumeText}`;

    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: analysisSchema
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AnalysisResult;
    } catch(e) {
        console.error("Failed to parse JSON response from Gemini:", response.text);
        throw new Error("The analysis result was not in the expected format. Please try again.");
    }
};

export const getCareerRoadmap = async (careerPath: CareerPath, resumeSummary: string): Promise<RoadmapResult> => {
    const prompt = `Create a detailed, step-by-step career roadmap for a person with the following summary: "${resumeSummary}" who wants to become a ${careerPath.role}. The roadmap should have 3-5 stages, from beginner to advanced. For each stage, provide a description, a comprehensive list of specific technical and soft skills to master, practical project ideas, and recommended resources (like online courses, books, or tools).`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            roadmap: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        stage: { type: Type.STRING },
                        description: { type: Type.STRING },
                        skillsToLearn: { type: Type.ARRAY, items: { type: Type.STRING } },
                        projectIdeas: { type: Type.ARRAY, items: { type: Type.STRING } },
                        resources: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }
    };
    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });
    return JSON.parse(response.text) as RoadmapResult;
}

export const getResumeSuggestions = async (resumeText: string): Promise<ResumeSuggestionsResult> => {
    const prompt = `Analyze the following resume text and provide 3-5 specific, actionable suggestions for improvement. For each suggestion, provide the original text snippet, the suggested change, and a brief explanation of why the change is beneficial. Focus on clarity, impact, and keyword optimization.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            suggestions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        originalText: { type: Type.STRING },
                        suggestedChange: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                    }
                }
            }
        }
    };
    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: { parts: [{ text: prompt }, { text: `\n\nResume Text:\n${resumeText}` }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });
    return JSON.parse(response.text) as ResumeSuggestionsResult;
}

export const getUpdatedAtsScore = async (resumeText: string): Promise<UpdatedAtsScoreResult> => {
    const prompt = `Based on the provided resume text, calculate an estimated Applicant Tracking System (ATS) score from 0 to 100.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            atsScore: { type: Type.INTEGER }
        }
    };
    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: { parts: [{ text: prompt }, { text: `\n\nResume Text:\n${resumeText}` }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });
    return JSON.parse(response.text) as UpdatedAtsScoreResult;
}

export const findJobListings = async (role: string, location: string, resumeSummary: string): Promise<{ listings: JobListing[], groundingMetadata: any }> => {
    const prompt = `You are a helpful job search assistant. Based on the following resume summary, find up to 5 recent and relevant job listings for a "${role}" in or near "${location}".

    Resume Summary: "${resumeSummary}"

    Return ONLY a valid JSON object with a single key "jobs". The value of "jobs" must be an array of job objects.
    Each job object must have the following keys: "title", "company", "location", "description", and "url".
    Ensure the URL is a direct and valid link to the job posting. Do not include any text, commentary, or markdown formatting outside of the JSON object.`;

    const response = await generateWithRetry("gemini-2.5-flash", {
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    let listings: JobListing[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    try {
        const textResponse = response.text.trim();
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.jobs && Array.isArray(parsed.jobs)) {
                listings = parsed.jobs;
            }
        }
    } catch (e) {
        console.error("Failed to parse job listings JSON from Gemini:", response.text, e);
    }

    return { listings, groundingMetadata };
};

export const runJobSearchAgentStream = async (mission: string, resumeSummary: string) => {
    const prompt = `You are an autonomous AI agent powered by the MCP (Mission, Capabilities, Plan) framework. Your task is to find job opportunities.

**Mission:** ${mission}
**Capabilities:** The candidate has the following background: "${resumeSummary}"

First, create a step-by-step **Plan** to achieve the mission. The plan should be a numbered list. Output the plan inside <plan> XML tags.

Second, execute the plan. As you work, provide your thought process and actions as a log. Output each log entry inside <log> XML tags.

Finally, after executing the plan, use your search tools to find up to 5 relevant job listings. Output the final list as a single JSON object inside <jobs> XML tags. The JSON object must have a key "jobs" which is an array of objects, each with "title", "company", "location", "description", and "url".

Start now.`;

    return ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });
};

export const getInterviewFeedback = async (transcript: InterviewTurn[]): Promise<InterviewReportResult> => {
    const formattedTranscript = transcript.map(turn => `${turn.speaker === 'model' ? 'Interviewer' : 'Candidate'}: ${turn.text}`).join('\n');

    const prompt = `You are an expert career coach. Analyze the following mock interview transcript. Provide a detailed performance report.
    
    - clarityScore: Score from 0-100 on the candidate's clarity and conciseness.
    - clarityFeedback: Feedback on clarity.
    - relevanceScore: Score from 0-100 on how relevant the answers were to the questions.
    - relevanceFeedback: Feedback on relevance.
    - confidenceScore: Score from 0-100 based on word choice and confidence.
    - confidenceFeedback: Feedback on confidence.
    - starMethodAdherence: Analyze if the candidate used the STAR (Situation, Task, Action, Result) method for behavioral questions. Provide a score from 0-100 and feedback.
    - relevantKeywordsUsed: Identify and list up to 5 key industry/role-specific keywords used by the candidate.
    - fillerWordCount: Count the approximate number of filler words (e.g., "um", "uh", "like", "you know").
    - sentiment: Analyze the overall sentiment of the candidate's responses ('Positive', 'Neutral', or 'Negative').
    - overallFeedback: A summary of the performance.
    - exampleImprovements: Provide 2 examples from the transcript of the user's answers and a suggestion for how to improve them.

    Transcript:
    ---
    ${formattedTranscript}
    ---
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            feedback: {
                type: Type.OBJECT,
                properties: {
                    clarityScore: { type: Type.INTEGER },
                    clarityFeedback: { type: Type.STRING },
                    relevanceScore: { type: Type.INTEGER },
                    relevanceFeedback: { type: Type.STRING },
                    confidenceScore: { type: Type.INTEGER },
                    confidenceFeedback: { type: Type.STRING },
                    starMethodAdherence: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.INTEGER },
                            feedback: { type: Type.STRING }
                        },
                        required: ["score", "feedback"]
                    },
                    relevantKeywordsUsed: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    fillerWordCount: { type: Type.INTEGER },
                    sentiment: { type: Type.STRING },
                    overallFeedback: { type: Type.STRING },
                    exampleImprovements: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                userAnswer: { type: Type.STRING },
                                suggestion: { type: Type.STRING }
                            },
                            required: ["userAnswer", "suggestion"]
                        }
                    }
                },
                 required: ["clarityScore", "clarityFeedback", "relevanceScore", "relevanceFeedback", "confidenceScore", "confidenceFeedback", "starMethodAdherence", "relevantKeywordsUsed", "fillerWordCount", "sentiment", "overallFeedback", "exampleImprovements"]
            }
        },
        required: ["feedback"]
    };

    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as InterviewReportResult;
    } catch(e) {
        console.error("Failed to parse interview feedback JSON from Gemini:", response.text, e);
        throw new Error("Could not generate interview feedback. Please try again later.");
    }
};

const structuredResumeSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The full name of the candidate." },
        email: { type: Type.STRING, description: "The candidate's email address." },
        phone: { type: Type.STRING, description: "The candidate's phone number." },
        linkedin: { type: Type.STRING, description: "The URL of the candidate's LinkedIn profile, if available." },
        summary: { type: Type.STRING, description: "The professional summary section." },
        experience: {
            type: Type.ARRAY,
            description: "The work experience section.",
            items: {
                type: Type.OBJECT,
                properties: {
                    company: { type: Type.STRING },
                    role: { type: Type.STRING },
                    dates: { type: Type.STRING },
                    description: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of bullet points describing responsibilities and achievements." }
                }
            }
        },
        education: {
            type: Type.ARRAY,
            description: "The education section.",
            items: {
                type: Type.OBJECT,
                properties: {
                    institution: { type: Type.STRING },
                    degree: { type: Type.STRING },
                    dates: { type: Type.STRING }
                }
            }
        },
        skills: {
            type: Type.ARRAY,
            description: "A list of key skills.",
            items: { type: Type.STRING }
        }
    }
};

export const structureResumeForPdf = async (resumeText: string): Promise<StructuredResume> => {
    const prompt = `Parse the following resume text into a structured JSON object. Identify the candidate's name, contact information (email, phone, LinkedIn), professional summary, work experience, education, and key skills. For work experience, list each job with the company, role, dates, and a list of bullet points for the description.`;

    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: { parts: [{ text: prompt }, { text: `\n\nResume Text:\n${resumeText}` }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: structuredResumeSchema
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StructuredResume;
    } catch(e) {
        console.error("Failed to parse structured resume JSON from Gemini:", response.text);
        throw new Error("Could not structure the resume for PDF export. Please check the text format.");
    }
};

export const findLinkedInConnections = async (company: string, role: string): Promise<LinkedInConnectionsResult> => {
    const prompt = `You are a professional networking assistant. Your task is to find 5-7 potential professional connections on LinkedIn who work at "${company}" in a "${role}" or similar/related role (e.g., manager, director in the same department).

    Use your search tool to find these individuals.

    Return ONLY a valid JSON object with a single key "connections". The value of "connections" must be an array of connection objects.
    Each connection object must have the following keys:
    - "name": The person's full name.
    - "title": Their current title at the company.
    - "linkedinUrl": The direct LinkedIn profile URL (e.g. https://www.linkedin.com/in/johndoe). If you cannot find the exact profile URL, provide a LinkedIn search URL formatted as: "https://www.linkedin.com/search/results/people/?keywords=Name+Company".

    Do not include any text, commentary, or markdown formatting outside of the JSON object.`;

    const response = await generateWithRetry("gemini-2.5-flash", {
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    let connectionsResult: LinkedInConnectionsResult = { connections: [] };

    try {
        const textResponse = response.text.trim();
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.connections && Array.isArray(parsed.connections)) {
                connectionsResult = parsed;
            }
        } else {
             throw new Error("No valid JSON found in the response.");
        }
    } catch (e) {
        console.error("Failed to parse connections JSON from Gemini:", response.text, e);
        throw new Error("Could not find connections. The AI returned an unexpected format.");
    }

    return connectionsResult;
};

export const craftNetworkingMessage = async (
    connection: Pick<LinkedInConnection, 'name' | 'title'> & { company: string },
    goal: MessageGoal,
    resumeSummary: string,
    jobDetails?: string
): Promise<string> => {
    let goalDescription = '';
    switch (goal) {
        case 'Informational Interview':
            goalDescription = "request a brief informational interview to learn more about their role and the company culture.";
            break;
        case 'Referral Request':
            goalDescription = `ask for a potential referral for the following role: "${jobDetails}".`;
            break;
        case 'General Networking':
            goalDescription = "make a professional connection for potential future opportunities.";
            break;
    }

    const prompt = `You are a professional communication coach. Craft a concise, polite, and professional LinkedIn message from a candidate to ${connection.name}, a ${connection.title} at ${connection.company}.

The candidate's background is summarized as: "${resumeSummary}"

The candidate's primary goal is to ${goalDescription}

The message should:
- Be respectful of their time.
- Briefly introduce the candidate and their background.
- Clearly state the purpose of the message.
- Show genuine interest in the person or company.
- Have a clear and simple call to action.
- Be under 150 words.

Return only the raw text of the message body, with no additional commentary, greetings (like "Hi [Name],"), or sign-offs (like "Best regards, [Your Name]"). The user will add these themselves.`;

    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: prompt,
    });

    return response.text.trim();
};

export const getCareerTrajectory = async (dreamJob: string, resumeSummary: string): Promise<CareerTrajectoryResult> => {
    const prompt = `You are an expert career strategist. A candidate with the following resume summary wants to achieve their dream job.

    **Resume Summary:** "${resumeSummary}"
    **Dream Job:** "${dreamJob}"

    Work backward from the dream job to create a realistic, step-by-step career trajectory. The trajectory should consist of 3-5 distinct roles or stages.

    For each step in the trajectory, provide:
    - **role:** The job title for this stage.
    - **duration:** A typical duration for this stage (e.g., "1-2 years").
    - **keyResponsibilities:** A short list of the primary responsibilities.
    - **skillsToAcquire:** A list of critical skills the candidate needs to learn or master during this stage to advance to the next one.
    - **suggestedResources:** A list of 1-2 specific, high-quality online resources (like a course from Coursera or a well-known book) to acquire those skills. Each resource should have a "name" and a valid "url".

    Return the result as a single JSON object.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            trajectory: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        role: { type: Type.STRING },
                        duration: { type: Type.STRING },
                        keyResponsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                        skillsToAcquire: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestedResources: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    url: { type: Type.STRING }
                                },
                                required: ["name", "url"]
                            }
                        }
                    },
                    required: ["role", "duration", "keyResponsibilities", "skillsToAcquire", "suggestedResources"]
                }
            }
        },
        required: ["trajectory"]
    };

     const response = await generateWithRetry('gemini-2.5-flash', {
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as CareerTrajectoryResult;
    } catch(e) {
        console.error("Failed to parse career trajectory JSON from Gemini:", response.text, e);
        throw new Error("Could not generate your career trajectory. The AI returned an unexpected format.");
    }
};

export const getJobFitAnalysis = async (resumeText: string, jobDescription: string): Promise<JobFitAnalysisResult> => {
    const prompt = `Analyze the provided resume text against the job description. Provide a comprehensive 'Job Fit' analysis.
    - fitScore: A score from 0-100 indicating how well the resume matches the job.
    - matchingSkills: A list of key skills present in both the resume and the job description.
    - skillGaps: A list of important skills mentioned in the job description that are missing from the resume. Explain why each skill is important.
    - actionableSteps: For the top 3 skill gaps, suggest a concrete, actionable step the candidate can take to learn that skill (e.g., a specific type of online course, a project idea).
    - overallVerdict: A 2-3 sentence summary of the candidate's suitability for the role and key recommendations.
    
    Resume Text:
    ---
    ${resumeText}
    ---
    
    Job Description:
    ---
    ${jobDescription}
    ---`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            fitScore: { type: Type.INTEGER },
            matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            skillGaps: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        skill: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    },
                    required: ["skill", "reason"]
                }
            },
            actionableSteps: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        skillGap: { type: Type.STRING },
                        suggestion: { type: Type.STRING }
                    },
                    required: ["skillGap", "suggestion"]
                }
            },
            overallVerdict: { type: Type.STRING }
        },
        required: ["fitScore", "matchingSkills", "skillGaps", "actionableSteps", "overallVerdict"]
    };

    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as JobFitAnalysisResult;
    } catch(e) {
        console.error("Failed to parse job fit analysis JSON from Gemini:", response.text, e);
        throw new Error("Could not analyze job fit. The AI returned an unexpected format.");
    }
};


export const getSuggestedNextSteps = async (analysisResult: AnalysisResult): Promise<{steps: SuggestedNextStep[]}> => {
    const weaknessesText = analysisResult.weaknesses.map(w => w.point).join(', ');
    const prompt = `Based on this resume analysis summary: "${analysisResult.summary}" and these weaknesses: "${weaknessesText}", suggest 2-3 immediate, actionable next steps for the user's career development. Frame these as direct recommendations. For each suggestion, also provide a 'targetTab' which is the most relevant section of the app to complete this action. The valid targetTab values are: 'analysis', 'jobs', 'trajectory', 'editor', 'linkedin', 'video', or 'vibe'.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            steps: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        suggestion: { type: Type.STRING },
                        targetTab: { type: Type.STRING, enum: ['analysis', 'jobs', 'trajectory', 'editor', 'linkedin', 'video', 'vibe'] }
                    },
                    required: ["suggestion", "targetTab"]
                }
            }
        },
        required: ["steps"]
    };

    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse suggested next steps JSON from Gemini:", response.text, e);
        // Return a default step in case of an error
        return {
            steps: [{
                suggestion: "Explore your suggested career paths in the Analysis Report.",
                targetTab: "analysis"
            }]
        };
    }
};

export const optimizeLinkedInProfile = async (
    currentHeadline: string,
    currentAbout: string,
    targetIndustry: string
): Promise<LinkedInOptimizationResult> => {
    const prompt = `You are an expert LinkedIn profile coach and copywriter. Rewrite the following LinkedIn headline and 'About' section to be more compelling and optimized for recruiters in the "${targetIndustry}" industry.

    Current Headline: "${currentHeadline}"
    Current About Section: "${currentAbout}"

    The rewritten versions should:
    - Use relevant keywords for the target industry.
    - Have a strong, professional, and engaging tone.
    - Clearly articulate the person's value proposition.
    - Include a subtle call to action in the 'About' section.
    - Provide a list of the key improvements you made.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            optimizedHeadline: {
                type: Type.STRING,
                description: "The rewritten, optimized LinkedIn headline."
            },
            optimizedAbout: {
                type: Type.STRING,
                description: "The rewritten, optimized LinkedIn 'About' section."
            },
            keyImprovements: {
                type: Type.ARRAY,
                description: "A list of 3-4 bullet points explaining the key changes and why they are beneficial.",
                items: { type: Type.STRING }
            }
        },
        required: ["optimizedHeadline", "optimizedAbout", "keyImprovements"]
    };

    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as LinkedInOptimizationResult;
    } catch(e) {
        console.error("Failed to parse LinkedIn optimization JSON from Gemini:", response.text, e);
        throw new Error("Could not optimize the LinkedIn profile. The AI returned an unexpected format.");
    }
};

export const analyzeVideoPitch = async (frames: string[], transcript: string): Promise<VideoPitchFeedback> => {
    const prompt = `You are an expert communication coach. Analyze the following video pitch based on the provided sequence of image frames and the speech transcript. Provide constructive, actionable feedback.

    **Speech Transcript:**
    ---
    ${transcript || '(No speech detected)'}
    ---

    **Analysis Instructions:**
    Based on the image frames, evaluate:
    - **Body Language:** Is the posture confident? Are there any distracting movements?
    - **Eye Contact:** Does the person appear to be looking at the camera/audience?
    - **Professionalism:** Is the background and attire appropriate?

    Based on the speech transcript, evaluate:
    - **Speech Clarity:** Is the language clear and easy to understand? Are there filler words?
    - **Pacing:** Is the speaking rate appropriate (not too fast or slow)?

    Provide a score from 0 to 100 for each category and brief feedback.
    Then, provide a concise overall feedback summary and a list of the top 3 actionable improvements.
    `;

    const imageParts = frames.map(frame => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: frame,
        },
    }));

    const textPart = { text: prompt };

    const schema = {
        type: Type.OBJECT,
        properties: {
            speechClarity: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} }, required: ["score", "feedback"] },
            pacing: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} }, required: ["score", "feedback"] },
            bodyLanguage: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} }, required: ["score", "feedback"] },
            eyeContact: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} }, required: ["score", "feedback"] },
            professionalism: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} }, required: ["score", "feedback"] },
            overallFeedback: { type: Type.STRING },
            actionableImprovements: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["speechClarity", "pacing", "bodyLanguage", "eyeContact", "professionalism", "overallFeedback", "actionableImprovements"]
    };

    const response = await generateWithRetry('gemini-2.5-flash', {
        contents: { parts: [imageParts[0] ? imageParts : [], textPart].flat() },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

     try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as VideoPitchFeedback;
    } catch(e) {
        console.error("Failed to parse Video Pitch Feedback JSON from Gemini:", response.text, e);
        throw new Error("Could not analyze the video pitch. The AI returned an unexpected format.");
    }
};


export const getCompanyVibeAnalysis = async (
  companyName: string,
  userVibe: UserVibeProfile
): Promise<{ analysis: CompanyVibeAnalysisResult, groundingMetadata: any }> => {
  const prompt = `You are a company culture analyst. A user wants to know if they are a cultural fit for "${companyName}".

  The user's preferred work environment is:
  - Pace: ${userVibe.pace}
  - Collaboration Style: ${userVibe.collaboration}
  - Company Structure: ${userVibe.structure}
  - Feedback Style: ${userVibe.feedback}

  Instructions:
  1.  Use Google Search to research the company culture of "${companyName}". Analyze sources like official blogs, news articles, and employee reviews to understand their work environment.
  2.  Based on your research, create a "Company Vibe" profile.
  3.  Compare the user's preferences with the company's vibe to generate a "Vibe Fit Score" from 0-100.
  4.  Provide a summary of the company's vibe and a detailed reasoning for the fit score.

  Return ONLY a single valid JSON object with the following structure. Do not include any text, commentary, or markdown formatting outside of the JSON object.
  The JSON object must have these keys:
  - "vibeFitScore": A number from 0 to 100.
  - "vibeSummary": A string summarizing the company's vibe.
  - "matchReasoning": A string explaining the fit score.
  - "companyVibe": An object with the following keys:
    - "pace": A string (e.g., "Fast-paced").
    - "collaboration": A string (e.g., "Highly collaborative").
    - "structure": A string (e.g., "Hierarchical").
    - "workLifeBalance": A string summarizing the work-life balance.
    - "keywords": An array of strings representing cultural keywords.`;

  const response = await generateWithRetry("gemini-2.5-flash", {
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  
  try {
    const textResponse = response.text.trim();
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Could not find a valid JSON object in the response.");
    }

    const analysis = JSON.parse(jsonMatch[0]) as CompanyVibeAnalysisResult;
    if (!analysis.companyVibe) {
        throw new Error("AI response was missing the 'companyVibe' object.");
    }
    return { analysis, groundingMetadata };
  } catch(e) {
    console.error("Failed to parse company vibe JSON from Gemini:", response.text, e);
    throw new Error("Could not analyze the company vibe. The AI returned an unexpected format.");
  }
};