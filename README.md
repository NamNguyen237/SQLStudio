# SQLStudio - Môi trường Học tập & Lập trình T-SQL / MSSQL Trực Tuyến

<div align="center">

![SQLStudio Banner](https://img.shields.io/badge/T--SQL-Microsoft%20SQL%20Server-0078D4?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite%208-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Deploy_Ready-22c55e?style=for-the-badge&logo=github)

<p align="center">
  <strong>Web IDE học tập và thực hành SQL Server thuần Client-side (100% In-Browser).</strong><br>
  Không cần cài đặt SQL Server nặng nề · Không cần máy chủ backend · Chạy mượt mà offline không cần mạng · Sẵn sàng triển khai lên GitHub Pages.
</p>

</div>

---

## 📖 Giới thiệu

**SQLStudio** là ứng dụng Web IDE được thiết kế dành riêng cho sinh viên đại học, cao đẳng và người tự học môn **Cơ sở dữ liệu (RDBMS)** và **Hệ quản trị CSDL SQL Server (T-SQL)**. 

Toàn bộ engine biên dịch và thực thi SQL chạy trực tiếp trong trình duyệt người dùng qua bộ nhớ RAM, giúp bạn:
- **Tập viết các lệnh khởi tạo chuẩn**: Tự do dùng `CREATE DATABASE`, `USE [TenDB]`, `CREATE TABLE` như trên SQL Server Management Studio (SSMS).
- **Học tập mọi lúc mọi nơi**: Chạy offline 100% khi mất mạng hoặc trên máy tính phòng thực hành không cài sẵn SQL Server.
- **Không lo lộ dữ liệu**: Tất cả dữ liệu và mã nguồn chỉ nằm trong trình duyệt máy bạn, không gửi lên bất kỳ server bên thứ ba nào.

---

## ✨ Tính năng nổi bật

### 1. Trình biên dịch T-SQL trực tiếp trên trình duyệt (In-Memory Engine)
- **Hỗ trợ đầy đủ các nhóm lệnh Đại học**:
  - **DDL**: `CREATE DATABASE`, `USE`, `DROP DATABASE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`.
  - **Ràng buộc toàn vẹn (Constraints)**: `PRIMARY KEY`, `FOREIGN KEY REFERENCES`, `CHECK`, `DEFAULT`, `UNIQUE`.
  - **DML**: `INSERT INTO`, `UPDATE ... WHERE`, `DELETE ... WHERE`, `TRUNCATE TABLE`.
  - **DQL & Lọc dữ liệu**: `SELECT`, `WHERE` (`LIKE`, `IN`, `BETWEEN`), `TOP N`, `DISTINCT`, `ORDER BY`.
  - **Phép kết (JOINs)**: `INNER JOIN`, `LEFT OUTER JOIN`, `RIGHT JOIN`, liên kết 3-4 bảng liên tiếp.
  - **Gom nhóm & Thống kê**: `GROUP BY`, `HAVING`, các hàm tổng hợp `COUNT(*)`, `SUM()`, `AVG()`, `MIN()`, `MAX()`.
  - **Hàm T-SQL tích hợp**: `GETDATE()`, `DATEDIFF()`, `YEAR()`, `MONTH()`, `DAY()`, `ISNULL()`, `COALESCE()`, `LEN()`, `SUBSTRING()`, `CHARINDEX()`.
  - **Nâng cao**: Truy vấn con (Subquery), biểu thức điều kiện `CASE WHEN`, hàm cửa sổ `ROW_NUMBER() OVER(PARTITION BY ...)`.
- **Mô phỏng Kế hoạch thực thi (Simulated Execution Plan)**: Thể hiện trực quan chi phí các toán tử Clustered Index Scan, Hash Match Join, Sort, Aggregate theo phong cách SSMS.

### 2. Quản lý CSDL động (Dynamic Database Explorer)
- **Khởi đầu hoàn toàn sạch**: Không chứa dữ liệu mẫu gây rối mắt.
- **Tự động nhận diện CSDL & Bảng**: Khi bạn chạy lệnh `CREATE DATABASE QL_SinhVien;`, hệ thống tự động sinh CSDL đó vào danh sách bên trái.
- **Hiển thị trực quan Schema**: Xem danh sách cột, kiểu dữ liệu, biểu tượng Khóa chính (**PK**) và Khóa ngoại (**FK**).
- **Sơ đồ quan hệ (ER Diagram)**: Bấm xem ngay sơ đồ thực thể liên kết 1:N giữa các bảng bạn vừa tạo.
- **Xuất CSDL (.sql)**: Tự động gom toàn bộ cấu trúc bảng và các dòng dữ liệu thành 1 file script `.sql` hoàn chỉnh để nộp bài tập.

### 3. Trình soạn thảo chuyên nghiệp (Code Editor)
- **Gợi ý cú pháp thông minh (IntelliSense Autocomplete)**: Tự động gợi ý từ khóa SQL, hàm và tên bảng/cột khi đang gõ phím.
- **Định dạng mã (Format SQL)**: Phím tắt `Shift + Alt + F` tự động căn lề, thụt dòng và viết hoa từ khóa chuẩn chỉnh.
- **Thực thi nhanh**: Phím tắt `F5` hoặc `Ctrl + Enter`.
- **Hỗ trợ file nội bộ**:
  - Nút **Mở file**: Đọc trực tiếp file `.sql` từ ổ cứng máy tính cá nhân vào editor.
  - Nút **Lưu file**: Tải câu lệnh trong editor về máy tính dạng `.sql`.
  - **Tự động lưu (Auto-save LocalStorage)**: Tắt trình duyệt mở lại vẫn giữ nguyên code và lịch sử truy vấn.

### 4. Sổ tay Cú pháp T-SQL Chuẩn Giáo Trình Đại Học (8 Chương)
Tích hợp sẵn giáo trình tra cứu kiến thức toàn diện:
1. **Chương 1**: Quản lý Cơ sở dữ liệu (USE, CREATE DATABASE, DROP DATABASE, Kiểu dữ liệu).
2. **Chương 2**: Định nghĩa Bảng & Ràng buộc toàn vẹn (PK, FK, CHECK, DEFAULT, UNIQUE).
3. **Chương 3**: Thao tác Dữ liệu DML (INSERT, UPDATE có WHERE, DELETE vs TRUNCATE).
4. **Chương 4**: Truy vấn cơ bản DQL (SELECT, AS, DISTINCT, WHERE, LIKE, ORDER BY, TOP).
5. **Chương 5**: Gom nhóm & Hàm tổng hợp (COUNT, SUM, AVG, GROUP BY, phân biệt WHERE vs HAVING).
6. **Chương 6**: Liên kết bảng (INNER JOIN, LEFT JOIN, Multi-table JOIN).
7. **Chương 7**: Các hàm tích hợp T-SQL (GETDATE, DATEDIFF, ISNULL, CASE WHEN).
8. **Chương 8**: Kỹ thuật nâng cao (Subquery, CTE WITH, ROW_NUMBER).

Mỗi bài học đều có: **Khái niệm**, **Cú pháp**, **Giải thích**, **Quy tắc quan trọng**, **Lỗi sinh viên thường gặp khi thi**, cùng code mẫu có nút **"Chạy thử ngay"**.

---

## 🚀 Hướng dẫn Cài đặt & Chạy trên máy tính (Local)

Yêu cầu máy tính đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).

```bash
# 1. Clone mã nguồn về máy
git clone <URL_REPOSITORY_CUA_BAN>
cd <thu_muc_du_an>

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Khởi chạy môi trường phát triển
npm run dev
```

Mở trình duyệt truy cập: `http://localhost:3000`

---

## 🌐 Hướng dẫn Triển khai lên GitHub Pages bằng GitHub Actions

Dự án đã được cấu hình sẵn file Workflow CI/CD tại `.github/workflows/deploy.yml` và đường dẫn tương đối `base: './'` trong `vite.config.ts`. Bạn chỉ cần thực hiện 3 bước sau:

### Bước 1: Đẩy mã nguồn lên GitHub
```bash
git add .
git commit -m "Deploy SQLStudio to GitHub Pages"
git push origin main
```
*(Nếu nhánh chính của bạn là `master`, workflow vẫn tự động kích hoạt).*

### Bước 2: Kích hoạt GitHub Pages trong Repository Settings
1. Truy cập vào Repository của bạn trên GitHub.
2. Bấm vào tab **Settings** (Cài đặt) ở góc trên.
3. Chọn mục **Pages** ở thanh menu bên trái.
4. Ở phần **Build and deployment** -> mục **Source**, chọn:
   👉 **GitHub Actions** *(thay vì "Deploy from a branch")*.

### Bước 3: Xem kết quả triển khai
1. Chuyển sang tab **Actions** trên GitHub để theo dõi tiến trình build tự động.
2. Sau khoảng 1-2 phút, GitHub Actions sẽ hoàn tất và hiển thị đường link trang web của bạn:
   ```
   https://<username>.github.io/<ten-repository>/
   ```
3. Giờ đây bạn và bạn bè có thể truy cập và thực hành T-SQL bất kỳ lúc nào từ điện thoại hoặc máy tính mà không cần cài đặt gì thêm!

---

## 🛠 Công nghệ sử dụng (Tech Stack)

| Thành phần | Công nghệ |
| :--- | :--- |
| **Giao diện & UI** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **Ngôn ngữ** | [TypeScript](https://www.typescriptlang.org/) |
| **Công cụ Build** | [Vite 8](https://vitejs.dev/) |
| **In-Browser SQL Engine** | [AlaSQL](https://github.com/AlaSQL/alasql) + T-SQL Polyfill & Extensions |
| **Biểu tượng (Icons)** | [Lucide React](https://lucide.dev/) |
| **Tự động hóa CI/CD** | [GitHub Actions](https://github.com/features/actions) |

---

## 📝 Bản quyền (License)

Phát hành dưới giấy phép [MIT License](LICENSE). Bạn hoàn toàn có thể tự do sử dụng, chỉnh sửa và chia sẻ phục vụ mục đích học tập và giảng dạy.
