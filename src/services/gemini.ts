import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getDiagnosis(symptoms: string[], patientInfo: { age: number; gender: string }) {
  const model = "gemini-3-flash-preview";
  const prompt = `As a medical diagnostic assistant for community health volunteers, analyze these symptoms: ${symptoms.join(", ")}. 
  Patient is ${patientInfo.age} years old and ${patientInfo.gender}. 
  Provide a potential diagnosis, severity level (low, medium, high, critical), and recommended immediate actions.
  Return the result in JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diagnosis: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["diagnosis", "severity", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function analyzeMalnutrition(imageBase64: string) {
  const model = "gemini-3-flash-preview";
  const prompt = "Analyze this image for signs of malnutrition in a child. Look for visible indicators like wasting, edema, or skin changes. Provide a risk level (none, low, moderate, severe) and a brief description of findings. Return in JSON.";

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskLevel: { type: Type.STRING, enum: ["none", "low", "moderate", "severe"] },
          analysis: { type: Type.STRING }
        },
        required: ["riskLevel", "analysis"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function checkForOutbreaks(records: any[]) {
  const model = "gemini-3-flash-preview";
  const prompt = `Analyze these recent health records for potential disease outbreaks: ${JSON.stringify(records)}. 
  If you detect a cluster of similar symptoms in a specific location, generate an alert.
  Return an array of alerts, each with type, location, description, and severity.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            location: { type: Type.STRING },
            description: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] }
          },
          required: ["type", "location", "description", "severity"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}
