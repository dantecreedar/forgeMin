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

export interface ArchitectureIssue {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles: string[];
  recommendation: string;
}

export interface CodebaseAnalysisResult {
  overview: string;
  stack: Array<{ name: string; role: string; version?: string }>;
  architecturePattern: string;
  layers: Array<{ name: string; description: string; fileCount: number }>;
  strengths: string[];
  issues: ArchitectureIssue[];
  recommendations: string[];
  securityNotes: string[];
  complexityScore: number;
  maintainabilityScore: number;
}

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private chatModel: GenerativeModel;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.chatModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} }] as any,
    });
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

    const result = await this.chatModel.generateContent(prompt);
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
    const prompt = `Answer the following question based on the project context and documents.

FORMAT RULES:
- Present the answer in a clean, highly organized, and professional layout.
- DO NOT use markdown headers or symbol clutter such as '###', '***', '---', or heavy asterisk lists like '* **Title:**'.
- Use clean headings, paragraph spacing, and standard bullets (•).

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

  async analyzeCodebaseArchitecture(
    files: Array<{ path: string; content: string }>,
    fullTree: string[],
  ): Promise<CodebaseAnalysisResult> {
    const filesBlock = files
      .map((f) => `=== ARCHIVO: ${f.path} ===\n${f.content.slice(0, 3000)}`)
      .join('\n\n');

    const prompt = `Eres un arquitecto de software senior. Analiza el código fuente de este repositorio y genera un informe técnico detallado en español.

Árbol de archivos del repositorio (estructura completa):
${fullTree.join('\n')}

Contenido de archivos clave:
${filesBlock}

Genera el análisis y responde ÚNICAMENTE con un JSON válido con este formato exacto (sin markdown, sin texto extra):
{
  "overview": "Descripción ejecutiva de la arquitectura en 2-3 párrafos",
  "stack": [
    { "name": "NestJS", "role": "Backend Framework", "version": "10.x" }
  ],
  "architecturePattern": "Clean Architecture / MVC / Microservices / Monolito / etc.",
  "layers": [
    { "name": "Domain", "description": "Contiene entidades y contratos de repositorio", "fileCount": 12 }
  ],
  "strengths": ["Fortaleza 1", "Fortaleza 2"],
  "issues": [
    {
      "severity": "high",
      "title": "Título conciso del problema",
      "description": "Descripción del problema encontrado en el código",
      "affectedFiles": ["src/archivo.ts"],
      "recommendation": "Acción concreta para resolver el problema"
    }
  ],
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "securityNotes": ["Nota de seguridad si existe, sino array vacío"],
  "complexityScore": 70,
  "maintainabilityScore": 75
}

Reglas:
- complexityScore y maintainabilityScore son números del 1 al 100
- Reporta issues reales encontrados en el código, no genéricos
- Si no hay problemas de seguridad, devuelve securityNotes: []
- El overview debe ser técnico y ejecutivo a la vez
- Detecta al menos 3 issues si existen en el código`;

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();
    try {
      return this.parseStructuredJson<CodebaseAnalysisResult>(responseText);
    } catch {
      // Fallback with basic structure if Gemini returns malformed JSON
      return {
        overview: responseText.slice(0, 500),
        stack: [],
        architecturePattern: 'No determinado',
        layers: [],
        strengths: [],
        issues: [],
        recommendations: [],
        securityNotes: [],
        complexityScore: 0,
        maintainabilityScore: 0,
      };
    }
  }

  private parseStructuredJson<T>(text: string): T {
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

    // Find the first '{' and use brace-counting to extract the full JSON object
    const start = cleaned.indexOf('{');
    if (start === -1) throw new Error('No JSON object found in AI response');

    let depth = 0;
    let end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (end === -1) throw new Error('Malformed JSON: unmatched braces in AI response');
    const jsonStr = cleaned.slice(start, end + 1);
    return JSON.parse(jsonStr) as T;
  }
}
