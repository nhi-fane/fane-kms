# A3 - Database Schema (FanE)

Tài liệu này định nghĩa cấu trúc cơ sở dữ liệu (Database Schema) bằng cú pháp Prisma ORM. Schema này phản ánh chính xác các Business Logic và luật toàn vẹn dữ liệu đã chốt trong PRD.

## Prisma Schema Khuyến nghị

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Client {
  clientCode  String    @id
  name        String
  legalName   String?
  industry    String?
  projects    Project[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Staff {
  staffId          String           @id
  fullName         String
  firstName        String
  role             String
  level            Int              @default(1) // Phân cấp để check rule giao việc "ngang cấp"
  costPerHour      Float            // Lương/Thù lao quy ra giờ (Bảo mật: Chỉ BOD thấy)
  standardHoursPerDay Float         @default(8) // Linh hoạt cho part-time/freelancer
  telegramId       String?          @unique // Dùng để liên kết với Chatbot
  isActive         Boolean          @default(true)
  
  // Relations
  projectsLed      Project[]        @relation("CreativeLead")
  tasksAssigned    TaskAssignee[]
  leaves           StaffLeaveLog[]
  timesheetsLogged Timesheet[]      @relation("TimesheetOwner")
  timesheetsApprvd Timesheet[]      @relation("TimesheetApprover")
  pnlTransactions  PnlTransaction[]
  leaveApprovals   StaffLeaveLog[]  @relation("LeaveApprover")

  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

model Project {
  projectCode     String           @id
  clientCode      String
  client          Client           @relation(fields: [clientCode], references: [clientCode])
  
  // Creative Lead Bắt buộc phải có theo PRD
  creativeLeadId  String
  creativeLead    Staff            @relation("CreativeLead", fields: [creativeLeadId], references: [staffId])
  
  name            String
  status          String           // Not Started, In Progress, Pending Feedback, Closed
  startDate       DateTime
  endDate         DateTime?
  note            String?
  
  tasks           Task[]
  pnlTransactions PnlTransaction[]

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  isDeleted       Boolean          @default(false)
  deletedAt       DateTime?
}

model StaffLeaveLog {
  logId        String   @id @default(uuid())
  staffId      String
  staff        Staff    @relation(fields: [staffId], references: [staffId])
  leaveDate    DateTime
  duration     Float    // 0.5 or 1.0
  session      String   // "Morning", "Afternoon", "FullDay"
  status       String   // Pending / Approved
  
  approvedById String?
  approvedBy   Staff?   @relation("LeaveApprover", fields: [approvedById], references: [staffId])

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Task {
  taskId       String         @id @default(uuid())
  parentTaskId String?
  parentTask   Task?          @relation("SubTasks", fields: [parentTaskId], references: [taskId])
  subTasks     Task[]         @relation("SubTasks")
  
  projectCode  String
  project      Project        @relation(fields: [projectCode], references: [projectCode])
  
  name         String
  description  String?
  startDate    DateTime
  deadline     DateTime
  status       String         // In Progress, Completed
  completedAt  DateTime?      // Lưu ngày thực tế hoàn thành để vẽ Gantt Chart
  
  assignees    TaskAssignee[]
  timesheets   Timesheet[]

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  isDeleted    Boolean        @default(false)
  deletedAt    DateTime?
}

// Bảng trung gian do 1 Task có thể giao cho nhiều người
model TaskAssignee {
  taskId      String
  task        Task     @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  staffId     String
  staff       Staff    @relation(fields: [staffId], references: [staffId], onDelete: Cascade)
  
  // Trạng thái 'Done' ở cấp độ cá nhân để chặn Bot nhắc nhở
  isDone      Boolean  @default(false) 
  completedAt DateTime? // Lưu lại chính xác thời điểm đánh dấu Done
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@id([taskId, staffId])
}

model Timesheet {
  logId                  String   @id @default(uuid())
  taskId                 String
  task                   Task     @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  
  staffId                String   // Ai là người log giờ này
  staff                  Staff    @relation("TimesheetOwner", fields: [staffId], references: [staffId])
  
  hoursLogged            Float    // Ghi nhận 0 nếu chủ động log 0. Nếu quên thì không sinh row này.
  logDate                DateTime
  logSource              String   // Web / Telegram
  
  approvalStatus         String   // Pending / Approved
  approvedById           String?  // Ai là người duyệt
  approvedBy             Staff?   @relation("TimesheetApprover", fields: [approvedById], references: [staffId])
  
  historicalCostPerHour  Float?   // Snapshot tại thời điểm duyệt
  pnlTransaction         PnlTransaction?

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}

model Vendor {
  vendorCode      String           @id
  name            String
  service         String?
  pnlTransactions PnlTransaction[]

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

model PnlTransaction {
  transactionId   String    @id @default(uuid())
  projectCode     String
  project         Project   @relation(fields: [projectCode], references: [projectCode], onDelete: Cascade)
  
  referenceId     String?   // Tham chiếu (VD: ID của Timesheet nếu là Internal Cost, ID hoá đơn nếu là External)
  category        String    // Internal_Cost / External_Cost / Revenue
  
  vendorCode      String?
  vendor          Vendor?   @relation(fields: [vendorCode], references: [vendorCode])
  
  staffId         String?   // Bắt buộc nếu là Internal_Cost
  staff           Staff?    @relation(fields: [staffId], references: [staffId])
  timesheetId     String?   @unique   // ID của Timesheet nếu là Internal Cost
  timesheet       Timesheet? @relation(fields: [timesheetId], references: [logId], onDelete: Cascade)
  
  amount          Float
  transactionDate DateTime
  loggedBy        String    // Account / Kế toán / System (auto)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model CompanyHoliday {
  id          String   @id @default(uuid())
  name        String   // Tên ngày lễ (VD: Tết Nguyên Đán, Giỗ tổ Hùng Vương)
  startDate   DateTime
  endDate     DateTime
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```
