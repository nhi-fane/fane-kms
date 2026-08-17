# Master Action Plan - Resource & P&L Management System (FanE)

## Mục tiêu
Xây dựng tài liệu kiến trúc (Architecture Design) và phát triển trực tiếp hệ thống quản trị Resource & P&L nội bộ cho FanE theo mô hình **In-house Development** (PO kiêm Vibe Coder + AI Agent).

## Lộ trình triển khai (Phối hợp giữa PO Genie & Nhi)

### Giai đoạn 1: Khai thác Yêu cầu chi tiết (Requirements Gathering)
- [x] **Bước 1: Cấu trúc Roles & User Flows**
  - Làm rõ hành trình phân quyền giữa nhóm Ban lãnh đạo (View Dashboard) và nhóm Nhập liệu (Account/Planning/Kế toán).
  - Xác định quy trình, điểm chạm và tần suất nhập liệu thực tế.
- [x] **Bước 2: Data Model & Logic Rules**
  - Phác thảo ERD cho các thực thể lõi: Client, Project, P&L, Team, Allocation... (bổ sung thêm nếu cần để holistic).
  - Chuẩn hoá Schema, Primary Keys và Relationships giữa các bảng.
  - Thống nhất Business Rules: công thức tính toán % phân bổ, cách ghi nhận chi phí/doanh thu (P&L) theo thời gian.
- [x] **Bước 3: Output Requirements (Report & Dashboard)**
  - Chốt danh sách các trường dữ liệu (data fields) cho Export Sheet *(Đã chuyển tính năng Export CSV sang Backlog - Phase sau)*.
  - Phác thảo tính năng và Wireframe sơ bộ cho Web App Dashboard (Interactive Report).

### Giai đoạn 2: Tổng hợp & Xây dựng PRD
- [x] **Bước 4: Soạn thảo PRD (Drafting)**
  - PO tổng hợp thông tin, vẽ ERD chuyên nghiệp, viết User Stories và Business Logic vào doc.
- [x] **Bước 5: Chuẩn hoá Naming Convention & Data Warehouse (Optimization)**
  - Rà soát các file csv, thống nhất ngôn ngữ (Project).
  - Tối ưu cấu trúc P&L Transaction.
- [x] **Bước 6: Review & Tinh chỉnh (Refinement)**
  - Nhi review bản draft, đưa ra feedback.
  - PO cập nhật, hoàn thiện PRD bản Final.

### Giai đoạn 3: System Architecture & Infrastructure Setup
- [x] **Bước 7: Chốt Tech Stack & Soạn thảo Architecture Design**
  - Lưu tài liệu thiết kế (Tech Stack: Vite + React, Backend: Node.js, Local DB: SQLite + Prisma, Network: CF Tunnels).
- [x] **Bước 8: Phác thảo ERD chuẩn xác với Data Types**
  - Lưu tài liệu ERD (Prisma Schema) vào file A3.
- [x] **Bước 9: Đóng gói & Chuyển giao (Handover Packaging)**
  - Đóng gói toàn bộ cấu trúc dự án (A0-A3, Prisma Schema) thành AI-Ready Workspace.
  - Thiết lập `README-Handover.md` để chuyển giao context cho AI ở máy mới.

### Giai đoạn 4: Execution & Vibe Coding (Pair-programming)
- [x] **Bước 10: Khởi tạo Môi trường & Database (Máy mới) + Local Backend API**
  - Đã chạy `npm install` và `npx prisma db push` để dựng lại DB trên máy mới.
  - Viết API xử lý logic và tích hợp Telegram Chatbot (API đã được code cơ bản trong `apps/backend/src`).
- [x] **Bước 11: Frontend Dashboard (Vite) & Tích hợp API**
  - [x] Xây dựng Interactive Dashboard theo cấu trúc PRD Zone 1, 2, 3, 4 (Đã xong UI/Logic tĩnh).
  - [x] Đấu nối fetch API thật từ Local Backend để hiển thị dữ liệu thực tế.
- [x] **Bước 12: Go-live Network & Deployment**
  - Sử dụng Ngrok làm Tunnel kết nối internet với Local Backend API (thay cho Cloudflare Tunnel).
  - Tích hợp Webhook cho Telegram Bot thông qua Tunnel URL.
  - Thay đổi biến môi trường của Frontend trỏ về Tunnel URL và Deploy Frontend tĩnh lên Cloudflare Pages.
  - *(Đã loại bỏ)* Thiết lập Auth bọc ngoài bằng Cloudflare Access (Chuyển sang Phase 5).
  - (Mới cập nhật) Viết cơ chế Real-time Dual Backup: Dùng Prisma Middleware gom nhóm sự kiện (debounce 30s) để tự động copy Local Backup và upload lên Google Drive mỗi khi có thay đổi DB.
  - (Mới cập nhật) Thiết lập cơ chế lưu trữ theo ngày (1 file/ngày) và Cronjob dọn dẹp file cũ trên 90 ngày.
- [x] **Bước 12.5: Custom Authentication Layer (Login UI & JWT)**
  - Cập nhật Prisma Schema: Thêm trường `password` cho bảng `Staff`.
  - Xây dựng API Backend: Cung cấp endpoint `/api/auth/login` tạo JWT token.
  - Xây dựng UI Frontend: Màn hình Đăng nhập và cơ chế lưu trữ Token để bảo vệ các trang Dashboard.
- [x] **Bước 13: E2E Flow Testing & Rollout**
  - Thực hiện Manual E2E Testing toàn luồng từ Frontend Dashboard <-> Backend <-> Telegram (thay vì test lẻ từng API).
  - Rollout cho team sử dụng.

### Giai đoạn 4.5: Security Hotfixes & Deployment Refinement (Post-Audit)
- [x] **Bước 14: Vá lỗ hổng bảo mật & Hoàn thiện Deployment**
  - [x] **Sprint 14.1: Security Core & Context-Aware Masking Engine**
    - Cấu hình Prisma (backend) loại trừ (`omit`) trường `password` ở tầng truy vấn ORM để đảm bảo mật khẩu không bao giờ bị lộ trên RAM server.
    - Xây dựng Context-Aware Masking Engine trả về nhãn "Censored" cho các trường nhạy cảm thay vì hard-code ẩn data theo role.
    - Implement cơ chế thu hồi token khẩn cấp (Revocation) bằng `tokenVersion` trong SQLite.
  - [x] **Sprint 14.2: Impersonation Boundaries & Audit**
    - Chặn Upward Impersonation (Cấp dưới không được phép đóng giả cấp trên).
    - Tích hợp `AuditService` log rõ ràng Actor -> Target cho mọi thao tác.
    - *(Đã hoàn thành)* Tích hợp ImpersonationBanner trên Dashboard (đã làm ở GĐ 4.7).
  - [x] **Sprint 14.3: Frontend Deployment Pipeline**
    - Cấu hình `wrangler` CLI tại thư mục `apps/frontend` và thiết lập lệnh `npm run deploy` để đẩy Frontend tĩnh lên Cloudflare Pages.
  - [x] **Sprint 14.4: Robust Authentication & Staff Provisioning**
    - Đổi cơ chế lưu password sang dạng Hash (Bcrypt).
    - Bổ sung My Profile (đổi password, cập nhật recovery email).
    - Xây dựng luồng Forgot/Reset Password gửi qua Gmail (Nodemailer).
    - Xây dựng tab Staff Management cho Admin Portal (Admin reset password về mặc định).
    - Cơ chế bắt buộc đổi mật khẩu khi đăng nhập lần đầu tiên.

### Giai đoạn 4.6: Master Data Management (Admin Portal)
- [ ] **Bước 15: Xây dựng Admin Portal (Phân rã thành các Sprint độc lập)**
  - [x] **Sprint 15.1: Backend API (Bulk Save & Data Validation):** Xây dựng endpoint `POST /api/admin/bulk-save` dùng Transaction để xử lý Atomic save, chặn hard-delete nếu đã có Data phát sinh.
  - [x] **Sprint 15.2: Frontend Scaffold & Dependencies:** Cài đặt `@tanstack/react-virtual`, tạo khung component `AdminPortal.tsx`, setup state quản lý draftData cho Client/Project, và thiết lập nút Global Save/Revert.
  - [x] **Sprint 15.3: Zone 1 - Client Management UI:** Dựng bảng Inline Editing cho Client, tính năng tìm kiếm, Auto-hide Archived Clients, và logic [+ New Client] lên đầu bảng.
  - [x] **Sprint 15.4: Zone 2 - Project Management UI:** Dựng UI lồng ghép Project theo Client, Sticky Headers, Half-Expander cho Archived Projects, chọn Creative Lead từ DB, và logic auto-calc End Date.
  - [x] **Sprint 15.5: End-to-End Integration:** Nối Frontend state với Backend Bulk API, test các edge cases (Validation lỗi, Virtual Scrolling mượt mà, lưu tạm dữ liệu khi cuộn).

### Giai đoạn 4.7: Authorization & CEO Permission Portal (Granular RBAC)
- [x] **Bước 16: Phân quyền Authorization & CEO Permission Portal (Phân rã thành các Sprint)**
  - [x] **Sprint 16.1: Database Schema & Migration:** Tạo các models `Role`, `Permission`, `RolePermission`, `StaffPermission`, và `AuditLog` trong Prisma. Update quan hệ với bảng `Staff`. Push DB và tạo file `seed_auth.ts` nạp dữ liệu mặc định.
  - [x] **Sprint 16.2: Backend Security Core:** Xây dựng middleware `checkPermission()` tự động resolve phân quyền (kết hợp override Staff và default Role). Tạo `AuditService` để ghi log các thay đổi permission.
  - [x] **Sprint 16.3: Backend API Endpoints:** Xây dựng API `GET /api/permissions/matrix` xuất mảng 2 chiều và `POST /api/permissions/override` để lưu thay đổi. Sửa endpoint `impersonate` tích hợp permission check.
  - [x] **Sprint 16.4: Frontend UI (CEO Portal & Impersonation):** Tạo component `CEOPermissionPortal.tsx` dạng Data Grid Matrix. Xây dựng dropdown `ImpersonationSelector` và UI hiển thị `ImpersonationBanner` cho luồng Read-only.

---

### Giai đoạn 5: Future Enhancements (Backlog)
- [ ] **Interactive P&L Dashboard:** Tích hợp báo cáo tài chính P&L nâng cao.
- [ ] **Export CSV:** Tính năng xuất báo cáo ra file CSV.

---
*File này sẽ được cập nhật liên tục (đánh dấu [x]) trong suốt quá trình chúng ta làm việc để theo dõi tiến độ.*
