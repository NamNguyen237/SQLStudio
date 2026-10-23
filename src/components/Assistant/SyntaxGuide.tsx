import React, { useState } from 'react';
import { X, Search, BookOpen, Code2, ArrowRight, ExternalLink } from 'lucide-react';

interface SyntaxItem {
  name: string;
  category: 'Truy vấn (DQL)' | 'Liên kết (JOIN)' | 'Gom nhóm (GROUP)' | 'Hàm T-SQL' | 'Nâng cao' | 'Định nghĩa (DDL)' | 'Thao tác (DML)';
  syntax: string;
  description: string;
  example: string;
}

const SYNTAX_ITEMS: SyntaxItem[] = [
  {
    name: 'SELECT ... FROM',
    category: 'Truy vấn (DQL)',
    syntax: 'SELECT [Cot1], [Cot2] FROM [TenBang];',
    description: 'Truy xuất các cột dữ liệu xác định từ bảng.',
    example: 'SELECT MaNV, HoTen, Luong FROM NhanVien;'
  },
  {
    name: 'SELECT TOP N',
    category: 'Truy vấn (DQL)',
    syntax: 'SELECT TOP N [CacCot] FROM [TenBang] ORDER BY [Cot] DESC;',
    description: 'Giới hạn số lượng dòng kết quả trả về trong T-SQL.',
    example: 'SELECT TOP 5 HoTen, Luong FROM NhanVien ORDER BY Luong DESC;'
  },
  {
    name: 'WHERE (Điều kiện)',
    category: 'Truy vấn (DQL)',
    syntax: 'SELECT * FROM [TenBang] WHERE [DieuKien];',
    description: 'Lọc các dòng thỏa mãn biểu thức logic (=, !=, >, <, AND, OR, NOT).',
    example: "SELECT * FROM NhanVien WHERE Luong >= 20000000 AND GioiTinh = 'Nữ';"
  },
  {
    name: 'LIKE & Ký tự đại diện',
    category: 'Truy vấn (DQL)',
    syntax: "SELECT * FROM [TenBang] WHERE [Cot] LIKE 'Mau%';",
    description: 'Tìm kiếm chuỗi: % đại diện cho nhiều ký tự, _ đại diện cho 1 ký tự.',
    example: "SELECT * FROM KhachHang WHERE Email LIKE '%@gmail.com';"
  },
  {
    name: 'INNER JOIN',
    category: 'Liên kết (JOIN)',
    syntax: 'SELECT * FROM BangA a INNER JOIN BangB b ON a.Khoa = b.Khoa;',
    description: 'Ghép các dòng từ hai bảng khi có giá trị tương ứng ở cột liên kết.',
    example: 'SELECT nv.HoTen, pb.TenPB FROM NhanVien nv INNER JOIN PhongBan pb ON nv.MaPB = pb.MaPB;'
  },
  {
    name: 'LEFT JOIN',
    category: 'Liên kết (JOIN)',
    syntax: 'SELECT * FROM BangA a LEFT JOIN BangB b ON a.Khoa = b.Khoa;',
    description: 'Giữ lại toàn bộ dữ liệu bảng trái, nếu bảng phải không khớp sẽ điền NULL.',
    example: 'SELECT sp.TenSP, ct.SoLuong FROM SanPham sp LEFT JOIN ChiTietDonHang ct ON sp.MaSP = ct.MaSP;'
  },
  {
    name: 'GROUP BY & HAVING',
    category: 'Gom nhóm (GROUP)',
    syntax: 'SELECT [Cot], COUNT(*) FROM [Bang] GROUP BY [Cot] HAVING COUNT(*) >= 2;',
    description: 'Gom nhóm dữ liệu và dùng HAVING để lọc trên kết quả tính toán.',
    example: 'SELECT MaPB, COUNT(MaNV) AS SoLuong FROM NhanVien GROUP BY MaPB HAVING COUNT(MaNV) >= 2;'
  },
  {
    name: 'Hàm ngày giờ (GETDATE, DATEDIFF)',
    category: 'Hàm T-SQL',
    syntax: "DATEDIFF(day, Ngay1, Ngay2), GETDATE(), YEAR(Ngay)",
    description: 'Lấy ngày hiện tại và tính chênh lệch giữa hai mốc thời gian.',
    example: "SELECT HoTen, DATEDIFF(year, NgayVaoLam, GETDATE()) AS SoNamLamViec FROM NhanVien;"
  },
  {
    name: 'ISNULL & COALESCE',
    category: 'Hàm T-SQL',
    syntax: 'ISNULL(GiaTri, ThayTheKhiNull)',
    description: 'Thay thế giá trị NULL bằng một giá trị mặc định chỉ định trước.',
    example: "SELECT HoTen, ISNULL(HocBong, 0) AS TienHocBong FROM SinhVien;"
  },
  {
    name: 'ROW_NUMBER() OVER(...)',
    category: 'Nâng cao',
    syntax: 'ROW_NUMBER() OVER(PARTITION BY [CotNhom] ORDER BY [CotSapXep] DESC)',
    description: 'Đánh số thứ tự tăng dần cho từng phân vùng trong tập kết quả.',
    example: 'SELECT HoTen, MaPB, ROW_NUMBER() OVER(PARTITION BY MaPB ORDER BY Luong DESC) AS RankPB FROM NhanVien;'
  },
  {
    name: 'CTE (WITH Bảng tạm)',
    category: 'Nâng cao',
    syntax: 'WITH BangTam AS ( SELECT ... ) SELECT * FROM BangTam;',
    description: 'Tạo bảng tạm biểu thức truy vấn chung (Common Table Expression) rõ ràng.',
    example: 'WITH LuongCao AS ( SELECT * FROM NhanVien WHERE Luong > 25000000 ) SELECT * FROM LuongCao;'
  },
  {
    name: 'CREATE TABLE',
    category: 'Định nghĩa (DDL)',
    syntax: 'CREATE TABLE [TenBang] ( [Cot] [KieuDuLieu] PRIMARY KEY, ... );',
    description: 'Khởi tạo cấu trúc bảng mới với các ràng buộc khóa chính và khóa ngoại.',
    example: 'CREATE TABLE DuAnMoi ( MaDA VARCHAR(10) PRIMARY KEY, TenDA NVARCHAR(100), NganSach DECIMAL(18,2) );'
  }
];

interface SyntaxGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode: (code: string) => void;
}

export const SyntaxGuide: React.FC<SyntaxGuideProps> = ({
  isOpen,
  onClose,
  onInsertCode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = ['all', 'Truy vấn (DQL)', 'Liên kết (JOIN)', 'Gom nhóm (GROUP)', 'Hàm T-SQL', 'Nâng cao', 'Định nghĩa (DDL)'];

  const filteredItems = SYNTAX_ITEMS.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(term) || 
      item.description.toLowerCase().includes(term) ||
      item.syntax.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                Sổ tay Cú pháp T-SQL & Microsoft SQL Server
              </h3>
              <p className="text-xs text-slate-400">
                Tra cứu nhanh các mẫu câu lệnh từ cơ bản đến nâng cao
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm cú pháp, hàm hoặc từ khóa (SELECT, JOIN, GROUP BY...)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat === 'all' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40">
          {filteredItems.map((item, idx) => (
            <div 
              key={idx}
              className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sky-300 text-xs font-mono">
                    {item.name}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                    {item.category}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-2.5">
                  {item.description}
                </p>

                <div className="p-2 bg-slate-950 border border-slate-800 rounded text-[11px] font-mono text-slate-400 mb-2">
                  <span className="text-slate-500 font-sans block text-[10px] mb-0.5">Cú pháp:</span>
                  <code>{item.syntax}</code>
                </div>

                <div className="p-2 bg-slate-950/80 border border-slate-800/80 rounded text-[11px] font-mono text-emerald-400">
                  <span className="text-slate-500 font-sans block text-[10px] mb-0.5">Ví dụ:</span>
                  <code>{item.example}</code>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => {
                    onInsertCode(item.example);
                    onClose();
                  }}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                >
                  <span>Thử ngay trong Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            Đóng sổ tay
          </button>
        </div>
      </div>
    </div>
  );
};
