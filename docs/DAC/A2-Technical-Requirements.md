# A2 - Technical Requirements

Tài liệu này định nghĩa các yêu cầu kỹ thuật chi tiết cho từng component của hệ thống FanE Traffic Management, tập trung vào các Sprint hiện tại và sắp tới.

## 1. Component: Authorization & Security Core
*Nền tảng phân quyền linh hoạt và bảo mật dữ liệu.*
- **Granular RBAC Middleware:** Xây dựng Middleware (ví dụ `checkPermission`) tại tầng API. Middleware đọc JWT để chặn các request không có quyền tương ứng ở Tầng 1.
- **Contextual ABAC Logic:** Tích hợp logic kiểm tra ngữ cảnh ở tầng Service. Tối ưu hóa câu query Prisma (sử dụng `include` hoặc `select`) để kiểm tra `Creative_Lead_ID` hoặc cấp bậc (`level`) nhằm chặn Upward Impersonation (cấp dưới không được đóng giả cấp trên).
- **Global Impersonation Interceptor:** Middleware toàn cục kiểm tra claim `impersonatorId`. Nếu tồn tại, chặn đứng (return `403`) mọi request có method `DELETE`.
- **Global Audit Logger:** Xây dựng `AuditService`. Bắt buộc ghi nhận thông tin `actorId` (người mượn quyền) và `targetId` (người bị mượn quyền) cho mọi hành động (Create/Update/Delete) để đảm bảo tính truy vết.
- **Context-Aware Masking Interceptor:** Tạo một Interceptor lớp cuối cùng trước khi response JSON. KHÔNG hard-code logic theo role, mà tự động kiểm tra mảng permissions và context (chủ sở hữu resource) để thay thế dữ liệu nhạy cảm (như financial data) bằng chuỗi `"Censored"`.
- **Tuyệt mật Password:** Mật khẩu KHÔNG BAO GIỜ được truy vấn ra khỏi Database (Ngoại trừ luồng Login). Bắt buộc sử dụng `omit` hoặc `select` ở Prisma Query để loại bỏ trường này từ gốc DB, thay vì chỉ dựa vào Interceptor ở tầng RAM.
- **Token Revocation (SQLite):** API đóng vai trò cổng duy nhất giao tiếp với SQLite. Sử dụng cơ chế lưu trữ trường `tokenVersion` trong bảng `Staff` để lập tức vô hiệu hóa Refresh Token khi cần thiết (không sử dụng Redis để giữ hệ thống siêu nhẹ).

## 2. Component: Admin Portal (Master Data Management)
*Giao diện quản lý Dữ liệu gốc thay thế Prisma Studio.*
- **Virtual Scrolling:** Áp dụng thư viện Virtualization (vd: `@tanstack/react-virtual` hoặc tương đương) trên Frontend để render bảng Client/Project. Đảm bảo DOM chỉ chứa các dòng đang hiển thị (khoảng 30-50 dòng) để chống giật lag.
- **API Pagination & Caching:** Tích hợp Cursor-based pagination hoặc Offset pagination kết hợp React Query (hoặc SWR) ở Frontend để query mượt mà.
- **Inline Edit State Management:** Frontend phải lưu trạng thái Staged (dữ liệu tạm thời được sửa) trong Global State (Redux/Zustand) và chỉ gọi API Bulk Update/Create khi bấm "Save Changes".

## 3. Component: My Portal & Timesheet Engine
*Nơi nhân sự nhận việc và chấm công.*
- **Time Constraints:** Logic Backend bắt buộc validate `Log_Date <= Today`. Chặn ném lỗi `400 Bad Request` nếu cố tình truyền ngày tương lai.
- **Overload Warning Engine:** API trả về Capacity % cần thực hiện phép tính Aggregation nhanh (SUM số giờ đã duyệt) chia cho (Tổng giờ chuẩn của số ngày làm việc trừ ngày phép). Prisma `groupBy` hoặc Raw SQL có thể cần thiết nếu dữ liệu lớn.
- **Financial Hook (PNL Generator):** Prisma Middleware hoặc Service hook ở API duyệt Timesheet (`timesheet:approve_...`). Thực thi lệnh Snapshot `Cost_Per_Hour` hiện tại và `INSERT` tự động 1 dòng ẩn vào bảng `PNL_TRANSACTION`. Bắt buộc chạy trong Prisma `$transaction`.

## 4. Component: Traffic Dashboard
*Bức tranh tổng thể về tài nguyên và hiệu suất.*
- **Data Aggregation API:** Cần 1 API endpoint riêng biệt `/api/dashboard/stats` để trả về JSON tổng hợp (Active Tasks, Pending Projects, Velocity). Tránh gọi nhiều API nhỏ lẻ gây nghẽn cổ chai (N+1 problem).
- **Gantt Chart Data Structure:** API phải trả về dữ liệu Tree-structured (Project -> Parent Task -> Sub Task) kết hợp với các mốc thời gian Start, End, Deadline, và các ngày nghỉ lễ để Frontend thư viện Gantt (vd: Frappe Gantt, Dhtmlx) render được ngay.

## 5. Component: Bot Integration (Telegram)
*Giao tiếp đa kênh.*
- **Webhook API:** Xây dựng API Webhook bảo mật (verify secret token từ Telegram) để nhận callback queries khi user bấm nút "Done" hoặc "Log 8h" từ chat.
- **Daily Cron Job:** Sử dụng `node-cron` hoặc BullMQ chạy vào 18:00 hàng ngày. Job cần query tất cả các Task `In Progress` của từng user, loại trừ ngày Lễ/Weekend/Phép, và bắn message qua Telegram Bot API.
