# A4 - Backend Implementation Plan

Tài liệu này trình bày phương án chi tiết để triển khai Bước 10: Xây dựng Backend API. Bản kế hoạch này dựa trên các yêu cầu nghiệp vụ (A1-Master-PRD) và kiến trúc (A2, A3) đã chốt.

## 1. Phương án triển khai chi tiết (Detailed Approach)

Chúng ta sẽ sử dụng Express.js + Prisma ORM + TypeScript để xây dựng API. Dựa trên PRD, các API sẽ được chia thành 2 phase nhỏ để đảm bảo xây dựng vững chắc từ móng lên:

### Phase 10.1: Foundation APIs (Luồng Khởi tạo)
Luồng này giúp Account và Quản lý tạo mới dự án, task, và quản lý nhân sự.
- **RESTful Endpoints:**
  - `POST /api/projects`: Tạo dự án mới (bắt buộc gắn `creativeLeadId`).
  - `GET /api/projects`: Lấy danh sách dự án (có thể filter theo status).
  - `POST /api/tasks`: Tạo task/sub-task và assign cho nhân sự (lưu vào bảng `Task` và `TaskAssignee`).
  - `GET /api/staff`: Lấy danh sách nhân sự (để hỗ trợ load UI filter/assignee).
- **Cấu trúc Thư mục:**
  - `src/controllers/`: Xử lý HTTP request/response.
  - `src/services/`: Chứa core business logic (ví dụ: logic tạo task phải insert cả `Task` và `TaskAssignee` bằng Prisma `$transaction`).

### Phase 10.2: Log Time & P&L APIs (Luồng Nhập liệu)
Luồng này phục vụ nhân sự log giờ và Lead duyệt giờ, tính toán P&L tự động.
- **RESTful Endpoints:**
  - `POST /api/timesheets`: Nhân viên log giờ (Web App / Telegram).
  - `PUT /api/timesheets/:id/approve`: Lead duyệt giờ. Logic cốt lõi (Rule 1 & Rule 2) nằm ở đây.
  - `PUT /api/timesheets/:id/unapprove`: Gỡ duyệt (phục hồi trạng thái & xóa chi phí).
  - `PUT /api/tasks/:id/assignees/:staffId/done`: Nhân viên đánh dấu đã xong phần việc cá nhân (`isDone = true` trong `TaskAssignee`).
- **Core Logic (Sử dụng Prisma `$transaction`):**
  - Khi Approve: Lấy `costPerHour` hiện tại của nhân sự $\rightarrow$ insert `Timesheet.historicalCostPerHour` $\rightarrow$ đổi status `Timesheet` thành 'Approved' $\rightarrow$ Upsert 1 record ẩn vào `PnlTransaction` với khóa `category='Internal_Cost'` & `referenceId=timesheetId`.
  - Khi Un-approve/Sửa: Update `Timesheet` status $\rightarrow$ Xóa/Update record tương ứng trong `PnlTransaction`.

---

## 2. Yêu cầu chất lượng (Quality Requirements)

Để hệ thống hoạt động ổn định và chính xác (đặc biệt là số liệu P&L), các API phải tuân thủ nghiêm ngặt các tiêu chuẩn chất lượng sau:

> **Idempotency (Tính toàn vẹn dữ liệu - Rule 1 & 2):**
> API Approve/Un-approve Timesheet bắt buộc phải xử lý Idempotency. Nếu mạng lag, Lead bấm "Approve" 2 lần, hệ thống chỉ được ghi nhận đúng 1 record `PnlTransaction`. Chúng ta sử dụng `Prisma $transaction` và khoá `@@unique([referenceId, category])` trong Schema để làm màng chắn bảo vệ ở tầng Database.

> **Data Privacy & Impersonate Mode:**
> Khi thiết lập Middleware phân quyền:
> - User thuộc nhóm Kế toán truy vấn `PnlTransaction` sẽ không bao giờ được trả về `staffId` (che mờ dữ liệu).
> - Tính năng "Impersonate" của PO (Nhi) sẽ có một token riêng chứa `isReadOnly=true`. Middleware phải kiểm tra và chặn `(Block 403 Forbidden)` toàn bộ request `POST/PUT/DELETE` nếu token này được sử dụng.

> **Chống Gian lận (Time Fraud):**
> API xử lý log giờ không được phép nhận `logDate` là ngày tương lai `(logDate > today)`. API duyệt giờ phải trả về cờ cảnh báo (Warning flag) nếu tổng giờ trong ngày của nhân sự đó > 24h.

---

## 3. Phương án Testing QA/QC

Theo định hướng In-house Development và PRD, chúng ta sẽ bỏ qua Unit/Integration Test phức tạp (vì tốn nguồn lực bảo trì). Thay vào đó, phương án kiểm thử là **Manual E2E Testing (API-first)** bằng các công cụ trực quan:

1. **API Testing (Thunder Client / Postman):**
   - Viết sẵn một bộ collection request chuẩn để test nhanh các API (Tạo Project, Tạo Task, Log Time).
   - **Idempotency Test Case:** Cố tình bắn request Approve Timesheet 2 lần liên tiếp và kiểm tra xem Database có báo lỗi hoặc xử lý mượt mà không (không bị duplicate record `PnlTransaction`).
   
2. **Database Integrity Check (Prisma Studio):**
   - Khởi chạy UI `npx prisma studio`.
   - PO (Nhi) và Genie sẽ cùng xem trực tiếp bảng dữ liệu sau mỗi thao tác API (Box test).
   - Chú ý quan sát sự nhảy số của bảng `PnlTransaction` khi trạng thái của `Timesheet` thay đổi.

3. **Telegram Chatbot Mock Testing:**
   - Dùng script để giả lập trigger cronjob (gọi hàm `sendDailyReminders()`) thay vì đợi đúng 18:00.
   - Kiểm tra xem Bot có bỏ qua các user thỏa mãn "Quy tắc Do Not Disturb" (đã đánh dấu Done / Đang nghỉ phép / Cuối tuần) hay không.
