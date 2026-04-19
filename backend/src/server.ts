import "dotenv/config"; // يجب أن يكون أول سطر
import { createServer } from "http";
import app from "./app";
import { connectDatabase } from "./config/database";
import { ensureRbacCatalog } from "./shared/rbac.service";
import { ensureRequestWorkflowHistoryTable } from "./modules/requests/workflow.service";
import { ensureAuditLogTable } from "./shared/audit-log.service";

const PORT = process.env.PORT || 5000;

// تشغيل السيرفر
async function startServer() {
  try {
    // الاتصال بقاعدة البيانات أولاً
    await connectDatabase();

    // Ensure critical runtime tables/catalogs exist before serving traffic.
    await Promise.all([
      ensureRbacCatalog(),
      ensureRequestWorkflowHistoryTable(),
      ensureAuditLogTable(),
    ]);

    const httpServer = createServer(app);

    // ثم تشغيل السيرفر
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();