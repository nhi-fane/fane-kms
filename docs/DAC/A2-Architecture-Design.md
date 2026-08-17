# A2 - System Architecture & Design (FanE)

Tài liệu này định nghĩa các công nghệ (Tech Stack) và kiến trúc hệ thống chính thức được sử dụng cho dự án FanE theo mô hình In-house Development. Tất cả các quyết định về Tech Stack và Data Integrity đều được lưu trữ tại đây.

## 1. System Architecture & Tech Stack (Decoupled)

Hệ thống hoạt động theo mô hình Client-Server kết nối qua đường hầm (Tunnels) để đảm bảo bảo mật và chi phí vận hành thấp (Local Server).

### 1.1. Frontend (Web Dashboard)
*   **Framework/Library:** React.js kết hợp TypeScript.
*   **Build Tool:** Vite.
*   **Styling & UI Components:** Tailwind CSS kết hợp với thư viện component Shadcn/ui (mang lại giao diện hiện đại, tính thẩm mỹ cao "Aesthetics").
*   **Charting:** Recharts hoặc Chart.js để vẽ biểu đồ biểu diễn resource (Zone 3) và Gantt (Zone 4).
*   **Deployment:** Cloudflare Pages (Hosting tĩnh mượt mà, miễn phí).
*   **Authentication & Security:** Sử dụng **Custom Authentication Layer (JWT + Local Login UI)** kết hợp với hệ thống **Granular RBAC/ABAC**. Tích hợp cơ chế **Short-lived JWT + HttpOnly Refresh Token + tokenVersion Revocation** để xử lý đăng xuất/thu hồi quyền khẩn cấp. (Hệ thống Cloudflare Access đã bị loại bỏ để phù hợp với luồng JWT custom).

### 1.2. Backend (Local Server)
*   **Language & Runtime:** Node.js + TypeScript (Đồng bộ ngôn ngữ với Frontend giúp duy trì context xuyên suốt quá trình Vibe Coding).
*   **API Framework:** Express.js hoặc Hono.
*   **Telegram Integration:** Thư viện `telegraf` (Node.js) nhận lệnh từ Telegram Bot. Cơ chế:
    *   *Dev/Testing Phase:* Polling.
    *   *Production Phase:* Webhook qua Cloudflare Tunnels.

### 1.3. Database & ORM
*   **Database Engine:** SQLite (Lưu trữ cục bộ dưới dạng 1 file `dev.db`, hiệu năng cực tốt cho internal tool, không cần cài đặt rườm rà).
*   **Bảo mật Database (Physical Security):** Do đặc thù SQLite không có hệ thống phân quyền User/Role nội bộ, **API Application là cổng duy nhất** được phép tương tác với dữ liệu. Cấm tuyệt đối việc cấp quyền đọc/ghi file `dev.db` cho bất kỳ ai không phải là System Maintainer/Super Admin, nhằm ngăn chặn việc "đi cửa sau" (bypass API Interceptor) để xem lén dữ liệu mật (lương, P&L).
*   **ORM (Object-Relational Mapping):** Prisma ORM. Prisma mang lại trải nghiệm phát triển xuất sắc, tự động migration và quản lý schema bằng code chặt chẽ.
*   **Backup:** Cơ chế tự động (OS Cronjob) đồng bộ file database (`.sqlite`) lên Google Drive hằng đêm để chống mất mát dữ liệu.

### 1.4. Network & Infrastructure
*   **Tunneling:** Cloudflare Tunnels (`cloudflared`). Cho phép expose Local Backend API ra môi trường internet một cách an toàn để Frontend và Telegram Webhook có thể giao tiếp mà không cần mở port trên Router vật lý. Tuân thủ mô hình Zero Trust.

---

## 2. Database Schema

*(Bản phác thảo Database Schema chi tiết được triển khai bằng Prisma ORM trong các bước tiếp theo. Bao gồm các bảng lõi: Client, Project, Staff, StaffLeave, Task, TaskAssignee, Timesheet, PnlTransaction và Vendor)*.
Điểm nhấn kiến trúc:
- Bắt buộc áp dụng cơ chế **Soft Delete** (`isDeleted` BOOLEAN, `deletedAt` TIMESTAMP) cho các bảng `Project` và `Task` thay vì xóa vật lý. Điều này để bảo vệ dữ liệu `Timesheet` và `PnlTransaction` (Sổ cái tài chính) không bị bốc hơi do cơ chế Cascade Delete khi User thao tác xóa Task. Mọi dữ liệu tài chính sẽ được bảo lưu trọn vẹn, task bị xóa chỉ bị ẩn đi trên UI.

---

## 3. Data Integrity & Idempotency Rules (Luật Toàn Vẹn)

Để ngăn chặn lỗi lag mạng hoặc user spam thao tác dẫn đến P&L bị duplicate, hệ thống bắt buộc áp dụng các ràng buộc (Constraints) ở thẳng tầng Database.

### Rule 1: Idempotency Key cho Sổ cái (Ledger)
- Khi một `TIMESHEET` chuyển trạng thái sang `Approved`, hệ thống tự động sinh ra một record vào bảng `PNL_TRANSACTION` với số tiền `amount = hours_logged * historical_cost_per_hour`.
- **Ràng buộc (Constraint):** Để đảm bảo tính Idempotency (gọi nhiều lần vẫn chỉ ra 1 kết quả), hệ thống sẽ sử dụng quan hệ 1-1 thông qua khóa `timesheetId String? @unique` trong bảng `PNL_TRANSACTION`. Prisma sẽ tự động bảo vệ không cho phép 1 Timesheet sinh ra quá 1 dòng chi phí nội bộ.
- Với Prisma, sử dụng `upsert` trên trường `timesheetId` cùng trong một Database Transaction (Prisma `$transaction`). Điều này đảm bảo dù Lead có bấm "Approve" 10 lần, chi phí cũng chỉ ghi đúng 1 lần.

### Rule 2: Application-level Idempotent Transaction (Sổ cái tự động hoá)
Việc sử dụng SQLite Triggers trực tiếp tuy chặn lỗi ở tầng thấp nhưng lại gây khó khăn trong việc maintain, debug và đặc biệt là Prisma không hỗ trợ native. Do đó, logic P&L quan trọng được đưa lên tầng Application (Backend API):
- Khi duyệt Timesheet, sử dụng **Prisma `$transaction`** để gói các hành động cập nhật trạng thái Timesheet và insert/update `PnlTransaction` vào cùng một giao dịch an toàn (All or Nothing).
- **Bắt buộc áp dụng Idempotency Key:** Khi chạy transaction, hàm tính toán phải sinh ra khóa chống trùng lặp dựa trên `Timesheet_Log_ID` để đảm bảo dù user có click đúp hoặc lag mạng, transaction cũng chỉ thực thi 1 lần.
- **Hành động Un-approve hoặc sửa số giờ:** Backend API phải tự động truy vấn và update lại (hoặc xóa) record trong `PnlTransaction` tương ứng với ID của Timesheet đó.
