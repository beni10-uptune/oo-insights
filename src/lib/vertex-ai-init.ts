import { VertexAI } from '@google-cloud/vertexai';

/**
 * Initialize Vertex AI with proper authentication for both local and Vercel
 */
export function initVertexAI() {
  const projectId = process.env.GCP_PROJECT_ID || 'oo-insights-468716';
  const location = process.env.VERTEXAI_LOCATION || 'europe-west1';

  // For Vercel deployment, use service account from env variable
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const serviceAccount = JSON.parse(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      );
      
      // Set up auth for Google Cloud libraries
      process.env.GOOGLE_APPLICATION_CREDENTIALS = JSON.stringify(serviceAccount);
      
      return new VertexAI({
        project: projectId,
        location: location,
        googleAuthOptions: {
          credentials: serviceAccount,
        },
      });
    } catch (error) {
      console.error('Failed to parse service account JSON:', error);
    }
  }

  // For local development, use Application Default Credentials
  return new VertexAI({
    project: projectId,
    location: location,
  });
}

export const vertexAI = initVertexAI();