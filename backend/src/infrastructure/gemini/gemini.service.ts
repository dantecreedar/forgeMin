import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface AIAnalysisResult {
  status: string;
  progress: number;
  summary: string;
  risks: string[];
  blockers: string[];
  nextSteps: string[];
}

export interface SprintPlanResult {
  tasks: Array<{
    title: string;
    category: string;
    estimatedHours: number;
    dependencies: string[];
  }>;
}

export interface ReportContentResult {
  summary: string;
  sections: Array<{ title: string; content: string }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  reply: string;
}

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const systemPrompt = messages.find((m) => m.role === 'system')?.content;
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const prompt = systemPrompt
      ? `${systemPrompt}\n\n${history.map((h) => `${h.role}: ${h.parts[0].text}`).join('\n')}`
      : history.map((h) => `${h.role}: ${h.parts[0].text}`).join('\n');

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    return { reply: text };
  }

  async createObjectiveFromText(text: string): Promise<{
    title: string;
    description?: string;
    tags?: string[];
  }> {
    const prompt = `Eres un asistente de ingeniería. Analiza el texto del usuario y extrae la información para crear un objetivo de proyecto.
Responde ÚNICAMENTE con JSON en este formato:
{
  "title": "título del objetivo",
  "description": "descripción detallada",
  "tags": ["tag1", "tag2"]
}
No incluyas markdown ni texto adicional.

Texto del usuario: ${text}`;

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse objective from AI response');
    return JSON.parse(jsonMatch[0]);
  }

  async analyzeObjective(
    objectiveTitle: string,
    commits: unknown[],
    pullRequests: unknown[],
    issues: unknown[],
  ): Promise<AIAnalysisResult> {
    const prompt = this.buildObjectivePrompt(objectiveTitle, commits, pullRequests, issues);
    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();
    return this.parseStructuredJson<AIAnalysisResult>(responseText);
  }

  async generateReleaseNotes(
    version: string,
    commits: unknown[],
    pullRequests: unknown[],
    objectives: unknown[],
  ): Promise<{ summary: string; sections: Array<{ title: string; items: string[] }> }> {
    const prompt = `Generate release notes for version ${version}.

Commits: ${JSON.stringify(commits)}
Pull Requests: ${JSON.stringify(pullRequests)}
Objectives implemented: ${JSON.stringify(objectives)}

Return JSON with: summary, sections (array of {title, items})`;
    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();
    return this.parseStructuredJson(responseText);
  }

  async generateReport(
    type: string,
    objectives: unknown[],
    timeline: unknown[],
    commits: unknown[],
  ): Promise<ReportContentResult> {
    const prompt = `Generate a ${type} engineering report.

Objectives: ${JSON.stringify(objectives)}
Timeline: ${JSON.stringify(timeline)}
Commits: ${JSON.stringify(commits)}

Return JSON with: summary, sections (array of {title, content})`;
    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();
    return this.parseStructuredJson<ReportContentResult>(responseText);
  }

  async planSprint(
    objectives: Array<{ title: string; description?: string }>,
  ): Promise<SprintPlanResult> {
    const prompt = `Break down the following objectives into sprint tasks.

Objectives: ${JSON.stringify(objectives)}

For each objective, create tasks with categories: backend, frontend, database, tests, documentation, devops, other.
Include estimated hours and dependencies.

Return JSON with: tasks (array of {title, category, estimatedHours, dependencies})`;
    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();
    return this.parseStructuredJson<SprintPlanResult>(responseText);
  }

  async queryKnowledge(
    question: string,
    context: unknown[],
  ): Promise<{ answer: string; relevantSources: string[] }> {
    const prompt = `Answer the following question based on the project context.

Question: ${question}

Context: ${JSON.stringify(context)}

Return JSON with: answer, relevantSources`;
    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();
    return this.parseStructuredJson(responseText);
  }

  private buildObjectivePrompt(
    title: string,
    commits: unknown[],
    pullRequests: unknown[],
    issues: unknown[],
  ): string {
    return `Analyze the progress of this software development objective:

Objective: "${title}"

Recent commits: ${JSON.stringify(commits)}
Related pull requests: ${JSON.stringify(pullRequests)}
Related issues: ${JSON.stringify(issues)}

Determine the most appropriate status based on the evidence:
- pending: no activity detected
- in_progress: commits or PRs referencing this objective
- partial: multiple PRs, some merged
- completed: implementation appears complete
- validated: PRs merged, tested
- released: included in a release
- blocked: issues or PRs indicating problems

Return JSON with: status, progress (0-100), summary, risks[], blockers[], nextSteps[]`;
  }

  private parseStructuredJson<T>(text: string): T {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse AI response as JSON');
    return JSON.parse(jsonMatch[0]) as T;
  }
}
