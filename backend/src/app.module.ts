import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { DeepSeekService } from './infrastructure/deepseek/deepseek.service';
import { GitHubClientService } from './infrastructure/github/github-client.service';
import { LocalGitService } from './infrastructure/git/local-git.service';
import { GeminiService } from './infrastructure/gemini/gemini.service';
import { FirebaseAuthService } from './infrastructure/firebase/firebase-auth.service';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { AUTH_SERVICE } from './domain/authentication/auth-service.interface';

import { AuthApplicationService } from './application/authentication/auth.service';
import { WorkspaceApplicationService } from './application/workspace/workspace.service';
import { ProjectApplicationService } from './application/project/project.service';
import { RepositoryApplicationService } from './application/repository/repository.service';
import { ObjectiveApplicationService } from './application/objective/objective.service';
import { AIEngineService } from './application/analysis/ai-engine.service';
import { SyncEngineService } from './application/analysis/sync-engine.service';
import { TimelineEngineService } from './application/analysis/timeline-engine.service';
import { ReportEngineService } from './application/analysis/report-engine.service';
import { ReleaseNotesEngineService } from './application/analysis/release-notes.service';
import { SprintPlannerService } from './application/analysis/sprint-planner.service';
import { KnowledgeBaseService } from './application/analysis/knowledge-base.service';
import { NotificationEngineService } from './application/analysis/notification-engine.service';
import { ChatService } from './application/chat/chat.service';

import { AuthController } from './presentation/controllers/auth.controller';
import { WorkspaceController } from './presentation/controllers/workspace.controller';
import { ProjectController } from './presentation/controllers/project.controller';
import { ObjectiveController } from './presentation/controllers/objective.controller';
import { RepositoryController } from './presentation/controllers/repository.controller';
import { ChatController } from './presentation/controllers/chat.controller';
import { EngineController } from './presentation/controllers/engine.controller';
import { EngineService } from './application/engine/engine.service';


import { AUTH_REPOSITORY } from './domain/authentication/auth.repository.interface';
import { WORKSPACE_REPOSITORY } from './domain/workspace/workspace.repository.interface';
import { PROJECT_REPOSITORY } from './domain/project/project.repository.interface';
import { REPOSITORY_REPOSITORY } from './domain/repository/repository.repository.interface';
import { OBJECTIVE_REPOSITORY } from './domain/objective/objective.repository.interface';
import { TIMELINE_REPOSITORY } from './domain/timeline/timeline.repository.interface';
import { REPORT_REPOSITORY } from './domain/report/report.repository.interface';
import { RELEASE_NOTES_REPOSITORY } from './domain/release/release-notes.repository.interface';
import { SPRINT_REPOSITORY } from './domain/sprint/sprint.repository.interface';
import { NOTIFICATION_REPOSITORY } from './domain/notification/notification.repository.interface';
import { KNOWLEDGE_REPOSITORY } from './domain/knowledge/knowledge.repository.interface';
import { GITHUB_CLIENT } from './infrastructure/github/github-client.interface';

import { FirestoreAuthRepository } from './infrastructure/persistence/firestore-auth.repository';
import { FirestoreWorkspaceRepository } from './infrastructure/persistence/firestore-workspace.repository';
import { FirestoreProjectRepository } from './infrastructure/persistence/firestore-project.repository';
import { FirestoreRepositoryRepository } from './infrastructure/persistence/firestore-repository.repository';
import { FirestoreObjectiveRepository } from './infrastructure/persistence/firestore-objective.repository';
import { FirestoreTimelineRepository } from './infrastructure/persistence/firestore-timeline.repository';
import { FirestoreReportRepository } from './infrastructure/persistence/firestore-report.repository';
import { FirestoreReleaseNotesRepository } from './infrastructure/persistence/firestore-release-notes.repository';
import { FirestoreSprintRepository } from './infrastructure/persistence/firestore-sprint.repository';
import { FirestoreNotificationRepository } from './infrastructure/persistence/firestore-notification.repository';
import { FirestoreKnowledgeRepository } from './infrastructure/persistence/firestore-knowledge.repository';

import { DocumentApplicationService } from './application/document/document.service';
import { DocumentController } from './presentation/controllers/document.controller';
import { DOCUMENT_REPOSITORY } from './domain/document/document.repository.interface';
import { FirestoreDocumentRepository } from './infrastructure/persistence/firestore-document.repository';

import { GmailService } from './infrastructure/gmail/gmail.service';
import { GmailController } from './presentation/controllers/gmail.controller';

const firestoreProviders = [
  { provide: AUTH_REPOSITORY, useClass: FirestoreAuthRepository },
  { provide: WORKSPACE_REPOSITORY, useClass: FirestoreWorkspaceRepository },
  { provide: PROJECT_REPOSITORY, useClass: FirestoreProjectRepository },
  { provide: REPOSITORY_REPOSITORY, useClass: FirestoreRepositoryRepository },
  { provide: OBJECTIVE_REPOSITORY, useClass: FirestoreObjectiveRepository },
  { provide: TIMELINE_REPOSITORY, useClass: FirestoreTimelineRepository },
  { provide: REPORT_REPOSITORY, useClass: FirestoreReportRepository },
  { provide: RELEASE_NOTES_REPOSITORY, useClass: FirestoreReleaseNotesRepository },
  { provide: SPRINT_REPOSITORY, useClass: FirestoreSprintRepository },
  { provide: NOTIFICATION_REPOSITORY, useClass: FirestoreNotificationRepository },
  { provide: KNOWLEDGE_REPOSITORY, useClass: FirestoreKnowledgeRepository },
  { provide: DOCUMENT_REPOSITORY, useClass: FirestoreDocumentRepository },
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', 'backend/.env'] }),
    ScheduleModule.forRoot(),
    FirebaseModule,
  ],
  controllers: [
    AuthController,
    WorkspaceController,
    ProjectController,
    ObjectiveController,
    RepositoryController,
    ChatController,
    EngineController,
    DocumentController,
    GmailController,
  ],
  providers: [
    AuthApplicationService,
    WorkspaceApplicationService,
    ProjectApplicationService,
    RepositoryApplicationService,
    ObjectiveApplicationService,
    DocumentApplicationService,
    AIEngineService,
    SyncEngineService,

    TimelineEngineService,
    ReportEngineService,
    ReleaseNotesEngineService,
    SprintPlannerService,
    KnowledgeBaseService,
    NotificationEngineService,
    DeepSeekService,
    ChatService,
    EngineService,
    GeminiService,
    LocalGitService,
    GmailService,
    { provide: GITHUB_CLIENT, useClass: GitHubClientService },
    { provide: AUTH_SERVICE, useClass: FirebaseAuthService },
    ...firestoreProviders,
  ],
})
export class AppModule {}

