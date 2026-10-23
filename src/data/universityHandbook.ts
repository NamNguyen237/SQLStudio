export interface HandbookLesson {
  id: string;
  chapterId: string;
  title: string;
  concept: string;
  syntax: string;
  explanation: string;
  codeSnippet: string;
  pitfalls?: string[];
  keyRules?: string[];
}

export interface HandbookChapter {
  id: string;
  title: string;
  description: string;
  iconName: string;
  lessons: HandbookLesson[];
}

export const UNIVERSITY_HANDBOOK: HandbookChapter[] = [
  {
    id: 'ch-01-db-management',
    title: 'Chương 1: Quản lý Cơ sở dữ liệu (DDL)',
    description: 'Khởi tạo, lựa chọn và xóa cơ sở dữ liệu với lệnh USE master, CREATE/DROP DATABASE.',
    iconName: 'Database',
    lessons: [
      {
        id: 'lesson-1-1',
        chapterId: 'ch-01-db-management',
        title: '1. Khởi tạo và sử dụng CSDL với USE & CREATE DATABASE',
        concept: 'Trong hệ quản trị SQL Server, cơ sở dữ liệu `master` là CSDL hệ thống điều khiển toàn bộ máy chủ. Trước khi tạo CSDL mới, sinh viên luôn chuyển ngữ cảnh về `master`.',
        syntax: `USE master;
GO
CREATE DATABASE [TenCoSoDuLieu];
GO
USE [TenCoSoDuLieu];
GO`,
        explanation: 'Từ khóa GO trong T-SQL là dấu hiệu ngắt đoạn (batch delimiter), báo hiệu cho SQL Server thực thi toàn bộ khối lệnh phía trước trước khi tiếp tục. Khi tạo xong DB, bắt buộc phải dùng USE để chuyển ngữ cảnh làm việc sang DB đó.',
        codeSnippet: `-- Bước 1: Về CSDL hệ thống master
USE master;
GO

-- Bước 2: Tạo CSDL mới cho đồ án môn học
CREATE DATABASE QL_SinhVien;
GO

-- Bước 3: Chuyển ngữ cảnh vào CSDL vừa tạo để làm việc
USE QL_SinhVien;
GO`,
        keyRules: [
          'Tên CSDL không nên chứa dấu cách hoặc ký tự tiếng Việt có dấu.',
          'Phải chạy lệnh `USE [TenDB]` thì các bảng tạo sau đó mới nằm trong đúng CSDL đó.'
        ],
        pitfalls: [
          'Quên lệnh `USE [TenDB]` dẫn đến việc tạo nhầm bảng vào CSDL hệ thống `master`.'
        ]
      },
      {
        id: 'lesson-1-2',
        chapterId: 'ch-01-db-management',
        title: '2. Xóa và tạo mới an toàn (DROP DATABASE IF EXISTS)',
        concept: 'Khi thực hành hoặc chấm điểm bài tập lớn, cần đảm bảo xóa sạch dữ liệu cũ nếu đã tồn tại để tránh lỗi trùng lặp tên DB.',
        syntax: `USE master;
GO
DROP DATABASE IF EXISTS [TenCSDL];
GO
CREATE DATABASE [TenCSDL];
GO
USE [TenCSDL];
GO`,
        explanation: 'Cú pháp `DROP DATABASE IF EXISTS` giúp script chạy an toàn trên mọi máy tính mà không báo lỗi nếu CSDL chưa từng được tạo trước đó.',
        codeSnippet: `USE master;
GO

-- Xóa CSDL cũ nếu đang tồn tại
DROP DATABASE IF EXISTS QL_NhanSu;
GO

-- Tạo mới CSDL sạch
CREATE DATABASE QL_NhanSu;
GO

USE QL_NhanSu;
GO`,
        keyRules: [
          'Không thể DROP một CSDL nếu phiên làm việc hiện tại đang USE chính CSDL đó (phải USE master trước).'
        ]
      },
      {
        id: 'lesson-1-3',
        chapterId: 'ch-01-db-management',
        title: '3. Các kiểu dữ liệu cơ bản trong T-SQL',
        concept: 'Việc chọn đúng kiểu dữ liệu quyết định tính toàn vẹn và dung lượng lưu trữ trên đĩa cứng.',
        syntax: `INT, BIGINT, DECIMAL(p,s), FLOAT, NVARCHAR(n), VARCHAR(n), DATE, DATETIME, BIT`,
        explanation: `• Số nguyên: INT (4 bytes, ~2 tỷ), BIGINT (8 bytes), TINYINT (0..255).
• Số thực / Tiền tệ: DECIMAL(18,2) (chính xác tuyệt đối cho tiền tệ), FLOAT.
• Chuỗi ký tự: NVARCHAR(n) (lưu Unicode tiếng Việt), VARCHAR(n) (chỉ ASCII), NVARCHAR(MAX).
• Ngày giờ: DATE (YYYY-MM-DD), DATETIME (chính xác đến mili-giây).
• Logic: BIT (0 hoặc 1).`,
        codeSnippet: `-- Ví dụ khai báo bảng kết hợp các kiểu dữ liệu đại học
CREATE TABLE NhanVien (
  MaNV VARCHAR(10) PRIMARY KEY,
  HoTen NVARCHAR(50) NOT NULL,
  NgaySinh DATE,
  Luong DECIMAL(18,2),
  DangLamViec BIT DEFAULT 1
);`,
        keyRules: [
          'Luôn dùng NVARCHAR khi lưu họ tên, địa chỉ tiếng Việt.',
          'Dùng DECIMAL(18,2) cho lương hoặc giá tiền, tránh làm tròn sai số như FLOAT.'
        ]
      }
    ]
  },
  {
    id: 'ch-02-tables-constraints',
    title: 'Chương 2: Định nghĩa Bảng & Ràng buộc (DDL)',
    description: 'Tạo bảng, chỉ định Khóa chính (PK), Khóa ngoại (FK), UNIQUE, CHECK, DEFAULT, IDENTITY.',
    iconName: 'Table',
    lessons: [
      {
        id: 'lesson-2-1',
        chapterId: 'ch-02-tables-constraints',
        title: '1. Khóa chính (PRIMARY KEY) & Khóa ngoại (FOREIGN KEY)',
        concept: 'Khóa chính định danh duy nhất từng dòng trong bảng. Khóa ngoại liên kết bảng con tới khóa chính của bảng cha nhằm bảo toàn tính toàn vẹn tham chiếu.',
        syntax: `CREATE TABLE BangCha (
  MaCha VARCHAR(10) PRIMARY KEY,
  TenCha NVARCHAR(50)
);

CREATE TABLE BangCon (
  MaCon VARCHAR(10) PRIMARY KEY,
  MaCha VARCHAR(10) FOREIGN KEY REFERENCES BangCha(MaCha)
);`,
        explanation: 'Khi tạo quan hệ 1:N, luôn phải tạo BẢNG CHA trước, sau đó mới tạo BẢNG CON tham chiếu tới bảng cha.',
        codeSnippet: `USE master;
GO
DROP DATABASE IF EXISTS QL_DaoTao;
GO
CREATE DATABASE QL_DaoTao;
GO
USE QL_DaoTao;
GO

-- 1. Tạo Bảng Cha: Khoa
CREATE TABLE Khoa (
  MaKhoa VARCHAR(10) PRIMARY KEY,
  TenKhoa NVARCHAR(50) NOT NULL
);

-- 2. Tạo Bảng Con: SinhVien (tham chiếu MaKhoa)
CREATE TABLE SinhVien (
  MaSV VARCHAR(10) PRIMARY KEY,
  HoTen NVARCHAR(50) NOT NULL,
  NgaySinh DATE,
  MaKhoa VARCHAR(10) FOREIGN KEY REFERENCES Khoa(MaKhoa)
);`,
        keyRules: [
          'Thứ tự tạo bảng: Bảng Cha trước, Bảng Con sau.',
          'Thứ tự xóa bảng: Bảng Con trước, Bảng Cha sau (ngược lại).'
        ],
        pitfalls: [
          'Tạo bảng con tham chiếu tới bảng cha chưa tồn tại sẽ gặp lỗi Msg 1767.'
        ]
      },
      {
        id: 'lesson-2-2',
        chapterId: 'ch-02-tables-constraints',
        title: '2. Các ràng buộc CHECK, DEFAULT, UNIQUE',
        concept: 'Các ràng buộc (Constraints) là luật bảo vệ CSDL khỏi dữ liệu bẩn hoặc sai logic kinh doanh ngay từ tầng cơ sở dữ liệu.',
        syntax: `CONSTRAINT [TenRangBuoc] CHECK (DieuKien)
DEFAULT [GiaTriMacDinh]
UNIQUE ([TenCot])`,
        explanation: 'CHECK kiểm tra biểu thức logic (ví dụ điểm từ 0 đến 10, lương > 0). DEFAULT tự động gán giá trị nếu người dùng không truyền. UNIQUE cấm trùng lặp.',
        codeSnippet: `CREATE TABLE MonHoc (
  MaMH VARCHAR(10) PRIMARY KEY,
  TenMH NVARCHAR(100) UNIQUE NOT NULL,
  SoTinChi INT CHECK (SoTinChi >= 1 AND SoTinChi <= 10) DEFAULT 3
);

CREATE TABLE KetQua (
  MaSV VARCHAR(10),
  MaMH VARCHAR(10),
  DiemThi DECIMAL(4,2) CHECK (DiemThi >= 0 AND DiemThi <= 10),
  PRIMARY KEY (MaSV, MaMH)
);`,
        keyRules: [
          'Khóa chính kết hợp (Composite PK) được khai báo ở cuối: PRIMARY KEY (Col1, Col2).'
        ]
      },
      {
        id: 'lesson-2-3',
        chapterId: 'ch-02-tables-constraints',
        title: '3. Sửa cấu trúc bảng với ALTER TABLE & DROP TABLE',
        concept: 'Khi muốn thêm cột, đổi kiểu dữ liệu hoặc thêm ràng buộc vào bảng đã có sẵn mà không làm mất dữ liệu.',
        syntax: `ALTER TABLE [TenBang] ADD [TenCot] [KieuDuLieu];
ALTER TABLE [TenBang] DROP COLUMN [TenCot];
DROP TABLE [TenBang];`,
        explanation: 'Lệnh ALTER TABLE cho phép chỉnh sửa schema trực tiếp. DROP TABLE xóa vĩnh viễn toàn bộ bảng cùng dữ liệu.',
        codeSnippet: `-- Thêm cột số điện thoại vào bảng SinhVien
ALTER TABLE SinhVien ADD SoDienThoai VARCHAR(15);

-- Xóa cột SoDienThoai
ALTER TABLE SinhVien DROP COLUMN SoDienThoai;`,
        keyRules: [
          'Không thể DROP TABLE bảng cha nếu vẫn còn bảng con đang giữ khóa ngoại tham chiếu đến nó.'
        ]
      }
    ]
  },
  {
    id: 'ch-03-dml-operations',
    title: 'Chương 3: Thao tác Dữ liệu (DML - INSERT, UPDATE, DELETE)',
    description: 'Thêm mới dòng dữ liệu, cập nhật dữ liệu có điều kiện và xóa dữ liệu an toàn.',
    iconName: 'Edit3',
    lessons: [
      {
        id: 'lesson-3-1',
        chapterId: 'ch-03-dml-operations',
        title: '1. Thêm dữ liệu với INSERT INTO',
        concept: 'Thêm một hoặc nhiều bản ghi vào bảng. Cần tuân thủ đúng thứ tự cột và kiểu dữ liệu.',
        syntax: `INSERT INTO [TenBang] ([Cot1], [Cot2]) VALUES ([Val1], [Val2]);
INSERT INTO [TenBang] VALUES ([Val1], [Val2], [Val3]);`,
        explanation: 'Nên luôn chỉ định danh sách cột sau tên bảng để tránh lỗi khi cấu trúc bảng thay đổi trong tương lai. Ký tự chuỗi tiếng Việt cần có tiền tố N\'...\'.',
        codeSnippet: `-- Thêm dữ liệu vào bảng Khoa
INSERT INTO Khoa (MaKhoa, TenKhoa) 
VALUES 
('CNTT', N'Khoa Công nghệ Thông tin'),
('KT', N'Khoa Kinh tế & Quản trị'),
('NN', N'Khoa Ngoại ngữ');

-- Thêm dữ liệu vào bảng SinhVien
INSERT INTO SinhVien (MaSV, HoTen, NgaySinh, MaKhoa)
VALUES 
('SV01', N'Nguyễn Văn An', '2004-03-15', 'CNTT'),
('SV02', N'Trần Thị Mai', '2004-08-20', 'CNTT'),
('SV03', N'Lê Hoàng Long', '2003-11-05', 'KT');`,
        keyRules: [
          'Chuỗi tiếng Việt có dấu trong MSSQL bắt buộc phải có chữ N phía trước: N\'Nguyễn Văn An\'.'
        ]
      },
      {
        id: 'lesson-3-2',
        chapterId: 'ch-03-dml-operations',
        title: '2. Cập nhật dữ liệu với UPDATE & SET',
        concept: 'Sửa đổi dữ liệu của các bản ghi đang có. Luôn phải cực kỳ cẩn trọng với mệnh đề WHERE.',
        syntax: `UPDATE [TenBang]
SET [Cot1] = [GiaTri1], [Cot2] = [GiaTri2]
WHERE [DieuKien];`,
        explanation: 'Nếu bỏ quên mệnh đề WHERE, câu lệnh sẽ cập nhật TOÀN BỘ dữ liệu của mọi dòng trong bảng thành giá trị mới.',
        codeSnippet: `-- Tăng học bổng thêm 500.000 cho sinh viên khoa CNTT
UPDATE SinhVien
SET HocBong = ISNULL(HocBong, 0) + 500000
WHERE MaKhoa = 'CNTT';`,
        pitfalls: [
          'Chạy UPDATE không có WHERE sẽ làm ghi đè toàn bộ dữ liệu cả bảng.'
        ]
      },
      {
        id: 'lesson-3-3',
        chapterId: 'ch-03-dml-operations',
        title: '3. Xóa dữ liệu với DELETE vs TRUNCATE',
        concept: 'DELETE xóa các dòng theo điều kiện WHERE (ghi log từng dòng). TRUNCATE giải phóng toàn bộ bảng ngay lập tức.',
        syntax: `DELETE FROM [TenBang] WHERE [DieuKien];
TRUNCATE TABLE [TenBang];`,
        explanation: 'DELETE FROM có thể lọc bằng WHERE, còn TRUNCATE TABLE xóa sạch toàn bộ dòng và reset lại cột IDENTITY về giá trị ban đầu.',
        codeSnippet: `-- Xóa sinh viên có mã SV03
DELETE FROM SinhVien WHERE MaSV = 'SV03';

-- Xóa toàn bộ dữ liệu bảng KetQua
TRUNCATE TABLE KetQua;`,
        keyRules: [
          'Không thể DELETE dòng của bảng cha nếu bảng con đang tham chiếu (lỗi vi phạm khóa ngoại FK).'
        ]
      }
    ]
  },
  {
    id: 'ch-04-dql-filtering',
    title: 'Chương 4: Truy vấn cơ bản & Lọc dữ liệu (DQL)',
    description: 'Mệnh đề SELECT, WHERE, LIKE, IN, BETWEEN, ORDER BY, TOP và DISTINCT.',
    iconName: 'Search',
    lessons: [
      {
        id: 'lesson-4-1',
        chapterId: 'ch-04-dql-filtering',
        title: '1. Mệnh đề SELECT, AS và DISTINCT',
        concept: 'SELECT là câu lệnh phổ biến nhất trong SQL để lấy dữ liệu. Dùng AS để đặt bí danh cho cột, DISTINCT để loại bỏ các dòng kết quả trùng nhau.',
        syntax: `SELECT DISTINCT [Cot1], [Cot2] AS [TenMoi] FROM [TenBang];`,
        explanation: 'DISTINCT áp dụng cho toàn bộ tổ hợp các cột được chọn trong SELECT.',
        codeSnippet: `-- Lấy danh sách các quê quán khác nhau của sinh viên
SELECT DISTINCT QueQuan 
FROM SinhVien;

-- Đặt tên bí danh dễ hiểu
SELECT MaSV AS [Mã Sinh Viên], HoTen AS [Họ và Tên] 
FROM SinhVien;`
      },
      {
        id: 'lesson-4-2',
        chapterId: 'ch-04-dql-filtering',
        title: '2. Lọc dữ liệu với WHERE, LIKE, IN, BETWEEN',
        concept: 'Mệnh đề WHERE xác định điều kiện chọn bản ghi.',
        syntax: `WHERE Cot = GiaTri
WHERE Cot BETWEEN A AND B
WHERE Cot IN (Val1, Val2, Val3)
WHERE Cot LIKE 'Mau%'`,
        explanation: `• LIKE '%abc': kết thúc bằng abc.
• LIKE 'abc%': bắt đầu bằng abc.
• LIKE '%abc%': chứa chuỗi abc.
• LIKE '_a%': ký tự thứ 2 là chữ a.`,
        codeSnippet: `-- Tìm sinh viên quê ở Hà Nội hoặc Hải Phòng và sinh năm 2004
SELECT * 
FROM SinhVien
WHERE QueQuan IN (N'Hà Nội', N'Hải Phòng')
  AND YEAR(NgaySinh) = 2004;

-- Tìm người có họ 'Nguyễn'
SELECT * 
FROM SinhVien
WHERE HoTen LIKE N'Nguyễn%';`
      },
      {
        id: 'lesson-4-3',
        chapterId: 'ch-04-dql-filtering',
        title: '3. Sắp xếp với ORDER BY & T-SQL TOP N',
        concept: 'ORDER BY sắp xếp tăng dần (ASC - mặc định) hoặc giảm dần (DESC). TOP N giới hạn số dòng trong SQL Server.',
        syntax: `SELECT TOP N [CacCot] 
FROM [TenBang] 
ORDER BY [Cot] DESC;`,
        explanation: 'Trong SQL Server, SELECT TOP N thay thế cho LIMIT trong MySQL hay PostgreSQL.',
        codeSnippet: `-- Lấy 3 sinh viên có học bổng cao nhất
SELECT TOP 3 HoTen, MaKhoa, HocBong
FROM SinhVien
ORDER BY HocBong DESC;`
      }
    ]
  },
  {
    id: 'ch-05-groupby-having',
    title: 'Chương 5: Gom nhóm & Hàm tổng hợp (GROUP BY & HAVING)',
    description: 'COUNT, SUM, AVG, MIN, MAX và phân biệt rạch ròi giữa WHERE và HAVING.',
    iconName: 'Layers',
    lessons: [
      {
        id: 'lesson-5-1',
        chapterId: 'ch-05-groupby-having',
        title: '1. Các hàm tổng hợp (Aggregate Functions)',
        concept: 'Thực hiện phép tính trên một tập hợp các giá trị và trả về một giá trị vô hướng duy nhất.',
        syntax: `COUNT([Cot]), SUM([Cot]), AVG([Cot]), MIN([Cot]), MAX([Cot])`,
        explanation: 'COUNT(*) đếm tất cả các dòng kể cả NULL. COUNT(TenCot) chỉ đếm các dòng mà cột đó có giá trị khác NULL.',
        codeSnippet: `SELECT 
  COUNT(MaSV) AS TongSinhVien,
  MAX(HocBong) AS HocBongCaoNhat,
  AVG(HocBong) AS HocBongTrungBinh,
  SUM(HocBong) AS TongTienHocBong
FROM SinhVien;`
      },
      {
        id: 'lesson-5-2',
        chapterId: 'ch-05-groupby-having',
        title: '2. Mệnh đề GROUP BY và Quy tắc Vàng',
        concept: 'GROUP BY gom các dòng có cùng giá trị ở các cột chỉ định thành một dòng tổng hợp.',
        syntax: `SELECT [CotNhom], COUNT(*) 
FROM [TenBang] 
GROUP BY [CotNhom];`,
        explanation: 'QUY TẮC VÀNG: Bất kỳ cột nào xuất hiện trong mệnh đề SELECT mà KHÔNG nằm bên trong hàm tổng hợp (SUM, COUNT, AVG...) thì BẮT BUỘC phải có mặt trong mệnh đề GROUP BY.',
        codeSnippet: `-- Đếm số lượng sinh viên của từng khoa
SELECT MaKhoa, COUNT(MaSV) AS SoSinhVien
FROM SinhVien
GROUP BY MaKhoa;`,
        pitfalls: [
          'Lỗi kinh điển Msg 8120: Chọn cột TenKhoa trong SELECT nhưng chỉ GROUP BY MaKhoa.'
        ]
      },
      {
        id: 'lesson-5-3',
        chapterId: 'ch-05-groupby-having',
        title: '3. Phân biệt WHERE vs HAVING',
        concept: 'WHERE lọc từng dòng TRƯỚC KHI gom nhóm. HAVING lọc các nhóm SAU KHI đã tính toán hàm tổng hợp.',
        syntax: `SELECT [CotNhom], COUNT(*) 
FROM [TenBang]
WHERE [DieuKienTungDong]
GROUP BY [CotNhom]
HAVING [DieuKienTrenHamTongHop];`,
        explanation: 'Không thể dùng hàm tổng hợp như `WHERE COUNT(*) >= 2` (báo lỗi cú pháp), bắt buộc phải dùng `HAVING COUNT(*) >= 2`.',
        codeSnippet: `-- Tìm các khoa có từ 2 sinh viên trở lên nhận học bổng > 0
SELECT MaKhoa, COUNT(MaSV) AS SoLuongSinhVien
FROM SinhVien
WHERE HocBong > 0
GROUP BY MaKhoa
HAVING COUNT(MaSV) >= 2;`
      }
    ]
  },
  {
    id: 'ch-06-joins',
    title: 'Chương 6: Liên kết bảng (JOINs)',
    description: 'INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN và Multi-table JOIN.',
    iconName: 'Link',
    lessons: [
      {
        id: 'lesson-6-1',
        chapterId: 'ch-06-joins',
        title: '1. Phép kết trong (INNER JOIN)',
        concept: 'Trả về các bản ghi có giá trị khớp nhau ở cả hai bảng thông qua biểu thức điều kiện ON.',
        syntax: `SELECT a.Cot1, b.Cot2 
FROM BangA a 
INNER JOIN BangB b ON a.KhoaChinh = b.KhoaNgoai;`,
        explanation: 'Nếu một dòng bên bảng A không có bản ghi tương ứng bên bảng B, dòng đó sẽ bị loại bỏ khỏi kết quả.',
        codeSnippet: `SELECT 
  sv.MaSV, 
  sv.HoTen, 
  k.TenKhoa
FROM SinhVien sv
INNER JOIN Khoa k ON sv.MaKhoa = k.MaKhoa;`
      },
      {
        id: 'lesson-6-2',
        chapterId: 'ch-06-joins',
        title: '2. Phép kết ngoài (LEFT OUTER JOIN)',
        concept: 'Giữ lại toàn bộ dữ liệu bảng bên trái (LEFT), kể cả khi không tìm thấy dòng tương ứng bên bảng phải. Cột của bảng phải sẽ nhận giá trị NULL.',
        syntax: `SELECT a.Cot, b.Cot 
FROM BangA a 
LEFT JOIN BangB b ON a.Khoa = b.Khoa;`,
        explanation: 'Rất hữu ích khi muốn tìm các bản ghi mồ côi hoặc chưa từng có dữ liệu liên kết (ví dụ: Khoa nào chưa có sinh viên nào theo học).',
        codeSnippet: `-- Tìm khoa chưa có bất kỳ sinh viên nào đăng ký
SELECT k.MaKhoa, k.TenKhoa
FROM Khoa k
LEFT JOIN SinhVien sv ON k.MaKhoa = sv.MaKhoa
WHERE sv.MaSV IS NULL;`
      },
      {
        id: 'lesson-6-3',
        chapterId: 'ch-06-joins',
        title: '3. Liên kết nhiều bảng (Multi-table JOIN)',
        concept: 'Nối tiếp các mệnh đề INNER JOIN để truy vấn xuyên suốt từ bảng này qua bảng khác.',
        syntax: `FROM BangA a
INNER JOIN BangB b ON a.ID = b.ID_A
INNER JOIN BangC c ON b.ID = c.ID_B`,
        explanation: 'Cần chú ý định rõ bảng nguồn khi các bảng có cùng tên cột bằng tiền tố bí danh (alias).',
        codeSnippet: `-- Lấy họ tên sinh viên, tên môn học và điểm thi
SELECT 
  sv.HoTen, 
  mh.TenMH, 
  kq.DiemThi
FROM KetQua kq
INNER JOIN SinhVien sv ON kq.MaSV = sv.MaSV
INNER JOIN MonHoc mh ON kq.MaMH = mh.MaMH;`
      }
    ]
  },
  {
    id: 'ch-07-tsql-functions',
    title: 'Chương 7: Các hàm tích hợp T-SQL (Built-in Functions)',
    description: 'Xử lý ngày tháng GETDATE/DATEDIFF, xử lý chuỗi LEN/SUBSTRING, ISNULL, CASE WHEN.',
    iconName: 'Code',
    lessons: [
      {
        id: 'lesson-7-1',
        chapterId: 'ch-07-tsql-functions',
        title: '1. Hàm xử lý ngày giờ (GETDATE, DATEDIFF, YEAR)',
        concept: 'Làm việc với kiểu dữ liệu DATE và DATETIME.',
        syntax: `GETDATE()
DATEDIFF(datepart, startdate, enddate)
YEAR(date), MONTH(date), DAY(date)`,
        explanation: 'DATEDIFF tính khoảng cách giữa hai mốc thời gian theo đơn vị year, month, day, hour...',
        codeSnippet: `-- Tính tuổi của sinh viên đến thời điểm hiện tại
SELECT 
  HoTen, 
  NgaySinh, 
  DATEDIFF(year, NgaySinh, GETDATE()) AS Tuoi
FROM SinhVien;`
      },
      {
        id: 'lesson-7-2',
        chapterId: 'ch-07-tsql-functions',
        title: '2. Xử lý giá trị NULL với ISNULL & COALESCE',
        concept: 'Trong SQL, bất kỳ phép toán nào với NULL (ví dụ: NULL + 10) đều sinh ra NULL. Do đó cần hàm chuyển đổi NULL thành giá trị an toàn.',
        syntax: `ISNULL(GiaTri, GiaTriThayThe)
COALESCE(Val1, Val2, Val3, ...)`,
        explanation: 'ISNULL nhận 2 tham số. COALESCE nhận vô số tham số và trả về giá trị đầu tiên khác NULL.',
        codeSnippet: `-- Nếu học bổng là NULL thì hiển thị số 0
SELECT 
  HoTen, 
  ISNULL(HocBong, 0) AS HocBongThucTe
FROM SinhVien;`
      },
      {
        id: 'lesson-7-3',
        chapterId: 'ch-07-tsql-functions',
        title: '3. Biểu thức điều kiện CASE WHEN',
        concept: 'Cung cấp cấu trúc if-then-else trực tiếp bên trong câu lệnh SELECT.',
        syntax: `CASE 
  WHEN DieuKien1 THEN GiaTri1
  WHEN DieuKien2 THEN GiaTri2
  ELSE GiaTriMacDinh
END`,
        explanation: 'Dùng để xếp loại, phân loại hoặc gán nhãn dữ liệu động.',
        codeSnippet: `-- Xếp loại điểm thi
SELECT 
  MaSV, 
  DiemThi,
  CASE 
    WHEN DiemThi >= 8.5 THEN N'Giỏi'
    WHEN DiemThi >= 7.0 THEN N'Khá'
    WHEN DiemThi >= 5.0 THEN N'Trung bình'
    ELSE N'Yếu'
  END AS XepLoai
FROM KetQua;`
      }
    ]
  },
  {
    id: 'ch-08-subquery-advanced',
    title: 'Chương 8: Truy vấn con (Subquery) & CTE',
    description: 'Subquery trong WHERE, EXISTS, Bảng tạm CTE WITH và Hàm cửa sổ ROW_NUMBER.',
    iconName: 'Sparkles',
    lessons: [
      {
        id: 'lesson-8-1',
        chapterId: 'ch-08-subquery-advanced',
        title: '1. Truy vấn con vô hướng (Scalar Subquery)',
        concept: 'Một câu SELECT lồng bên trong câu SELECT khác trả về chính xác 1 dòng 1 cột giá trị.',
        syntax: `SELECT * FROM Bang WHERE Cot > (SELECT AVG(Cot) FROM Bang);`,
        explanation: 'Subquery vô hướng được thực thi trước để tính toán con số so sánh (ví dụ: mức điểm trung bình).',
        codeSnippet: `-- Tìm sinh viên có học bổng cao hơn mức học bổng trung bình
SELECT MaSV, HoTen, HocBong
FROM SinhVien
WHERE HocBong > (SELECT AVG(HocBong) FROM SinhVien WHERE HocBong > 0);`
      },
      {
        id: 'lesson-8-2',
        chapterId: 'ch-08-subquery-advanced',
        title: '2. Bảng tạm biểu thức chung WITH (CTE)',
        concept: 'Common Table Expressions giúp tách nhỏ các câu truy vấn phức tạp thành các khối rõ ràng, dễ đọc hơn so với subquery lồng nhau.',
        syntax: `WITH [TenCTE] AS (
  SELECT ...
)
SELECT * FROM [TenCTE];`,
        explanation: 'CTE tồn tại trong phạm vi của câu truy vấn đơn lẻ ngay sau nó.',
        codeSnippet: `WITH SinhVienKhaGioi AS (
  SELECT MaSV, HoTen, MaKhoa, HocBong
  FROM SinhVien
  WHERE HocBong >= 1500000
)
SELECT * 
FROM SinhVienKhaGioi
WHERE MaKhoa = 'CNTT';`
      },
      {
        id: 'lesson-8-3',
        chapterId: 'ch-08-subquery-advanced',
        title: '3. Hàm cửa sổ T-SQL (ROW_NUMBER)',
        concept: 'Đánh số thứ tự tăng dần theo phân vùng (PARTITION BY) mà không làm gộp dòng như GROUP BY.',
        syntax: `ROW_NUMBER() OVER (PARTITION BY [CotNhom] ORDER BY [CotSapXep] DESC)`,
        explanation: 'Ứng dụng kinh điển để tìm top 1 người điểm cao nhất của từng khoa.',
        codeSnippet: `-- Đánh số thứ tự sinh viên theo học bổng trong từng khoa
SELECT 
  HoTen, 
  MaKhoa, 
  HocBong,
  ROW_NUMBER() OVER (PARTITION BY MaKhoa ORDER BY HocBong DESC) AS XepHangTrongKhoa
FROM SinhVien;`
      }
    ]
  }
];
