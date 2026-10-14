/**
 * Espacios de nombres del bundle para el corte "Modales, tareas extra, usuarios y permisos" (paso 6).
 * Cada línea: export * as <nombre> from './ruta/modulo.js'; — solo módulos de ESTE corte.
 */
export * as approvalPolicy from './domain/auth/approval-policy.js';
export * as permissionService from './domain/permissions/permission-service.js';
export * as userApprovalList from './domain/permissions/user-approval-list.js';
export * as extraTask from './domain/tasks/extra-task.js';
export * as exceptionJustification from './domain/tasks/exception-justification.js';
export * as approvalsRepository from './services/firebase/firebase-approvals-repository.js';
export * as approvalsController from './controllers/approvals-controller.js';
export * as approvalBoxes from './ui/components/approval-boxes.js';
export * as listNotice from './ui/components/list-notice.js';
export * as modalView from './ui/components/modal.js';
export * as pendingUsersTable from './ui/components/pending-users-table.js';
export * as pendingPermissionsTable from './ui/components/pending-permissions-table.js';
