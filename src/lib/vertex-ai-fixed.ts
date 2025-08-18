import { VertexAI } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize Vertex AI with proper authentication
 */
export function initVertexAI() {
  const projectId = process.env.GCP_PROJECT_ID || 'oo-insights-468716';
  const location = process.env.VERTEXAI_LOCATION || 'europe-west1';

  console.log(`Initializing Vertex AI for project: ${projectId}, location: ${location}`);

  // Try different authentication methods
  
  // Method 1: Service account JSON in environment variable (for Vercel)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const serviceAccount = JSON.parse(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      );
      
      console.log('Using service account from GOOGLE_APPLICATION_CREDENTIALS_JSON');
      
      return new VertexAI({
        project: projectId,
        location: location,
        googleAuthOptions: {
          credentials: serviceAccount,
          projectId: projectId,
        },
      });
    } catch (error) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
    }
  }

  // Method 2: Service account file path (for local development)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      // Check if it's a path or JSON string
      if (credPath.startsWith('{')) {
        // It's JSON content
        const serviceAccount = JSON.parse(credPath);
        console.log('Using service account from GOOGLE_APPLICATION_CREDENTIALS (JSON)');
        
        return new VertexAI({
          project: projectId,
          location: location,
          googleAuthOptions: {
            credentials: serviceAccount,
            projectId: projectId,
          },
        });
      } else if (fs.existsSync(credPath)) {
        // It's a file path
        const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        console.log('Using service account from file:', credPath);
        
        return new VertexAI({
          project: projectId,
          location: location,
          googleAuthOptions: {
            credentials: serviceAccount,
            projectId: projectId,
          },
        });
      }
    } catch (error) {
      console.error('Failed to load GOOGLE_APPLICATION_CREDENTIALS:', error);
    }
  }

  // Method 3: Try to use Application Default Credentials
  console.log('Falling back to Application Default Credentials');
  
  return new VertexAI({
    project: projectId,
    location: location,
  });
}

let vertexInstance: VertexAI | null = null;

/**
 * Get or create Vertex AI instance
 */
export function getVertexAI(): VertexAI {
  if (!vertexInstance) {
    vertexInstance = initVertexAI();
  }
  return vertexInstance;
}

/**
 * Test Vertex AI connection
 */
export async function testVertexAI(): Promise<boolean> {
  try {
    const vertex = getVertexAI();
    const model = vertex.preview.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const result = await model.generateContent('Say "hello" in one word');
    const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('Vertex AI test successful:', response);
    return true;
  } catch (error) {
    console.error('Vertex AI test failed:', error);
    return false;
  }
}

export const vertexAI = getVertexAI();