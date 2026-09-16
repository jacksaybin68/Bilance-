# i18n Audit Report — NexTrading (2026-09-16)

## Tóm tắt

| Frontend | VI keys | EN keys | Keys used | Unused | Missing EN | Status |
|----------|---------|---------|-----------|--------|------------|--------|
| okbong-admin-frontend | 107 | 107 | 83 | 24 | 0 | ✅ Tốt |
| okbong-user-frontend | 210 | 210 | 110 | 100 | 0 | ✅ Tốt |

**Kết luận**: Cả hai frontend đều có i18n system hoàn chỉnh. EN translation đầy đủ, không missing key. Không cần sửa file.

---

## 1. Kiểm tra cấu trúc i18n

### okbong-admin-frontend/
- File: `src/lib/i18n/messages.ts` — định nghĩa 107 key cho cả vi + en
- File: `src/lib/i18n/index.tsx` — I18nProvider + useI18n hook (React Context)
- Tích hợp vào `AdminLayout.tsx` với localStorage key `admin.locale`
- 19 component/page sử dụng `useI18n()` — tất cả import đúng, gọi `t()` đúng cách

### okbong-user-frontend/
- File: `src/lib/i18n/messages.ts` — định nghĩa 210 key cho cả vi + en
- File: `src/lib/i18n/index.tsx` — I18nProvider + useI18n hook (Next.js 'use client')
- Tích hợp với localStorage key `okbong.locale`
- 19 component/page sử dụng `useI18n()` — tất cả import đúng, gọi `t()` đúng cách

---

## 2. Audit admin frontend: keys unused (24 key)

Những key được define trong messages.ts nhưng không được dùng ở bất kỳ component nào:

| Key | VN | EN | Ghi chú |
|-----|----|----|---------|
| `common.all` | Tất cả | All | Có thể dùng cho dropdown "All" |
| `common.empty` | Không có dữ liệu | No data | Có thể dùng khi DataTable rỗng |
| `common.forbidden` | Bạn không có quyền truy cập... | You are not allowed... | Chỉ dùng title+body, bỏ main msg |
| `common.loading` | Đang tải… | Loading… | Chưa dùng, có thể dùng cho loading state |
| `common.refresh` | Làm mới | Refresh | Chưa dùng, có thể dùng cho button refresh |
| `metric.totalUsers` | Tổng người dùng | Total Users | Dashboard metric (có thể chưa render) |
| `metric.totalBills` | Tổng hoá đơn | Total Bills | Dashboard metric |
| `metric.totalBalance` | Tổng số dư | Total Balance | Dashboard metric |
| `nav.activity` | Nhật ký hoạt động | Activity Log | Menu nav (trang chưa active) |
| `nav.banned` | Người dùng bị khoá | Banned Users | Menu nav |
| `nav.bills` | Quản lý hoá đơn | Bill Management | Menu nav |
| `nav.cards` | Quản lý thẻ | Card Management | Menu nav |
| `nav.cron` | Tác vụ định kỳ | Cron Jobs | Menu nav |
| `nav.payments` | Lịch sử thanh toán | Payment History | Menu nav |
| `nav.plans` | Gói dịch vụ | Plan Management | Menu nav |
| `nav.settings` | Cài đặt | Settings | Menu nav |
| `nav.users` | Người dùng | User Management | Menu nav |
| `nav.wallets` | Ví / Ngân hàng | Wallets/Banks | Menu nav |
| `page.dashboard.billCreated` | Hoá đơn được tạo | Bill created | Dashboard widget |
| `page.dashboard.deposit` | Nạp tiền thành công | Deposit successful | Dashboard widget |
| `page.dashboard.newUser` | Người dùng mới đăng ký | New user registered | Dashboard widget |
| `page.dashboard.transactionVolume` | Khối lượng giao dịch | Transaction Volume | Dashboard widget |
| `status.blocked` | Bị chặn | Blocked | Status tag |
| `table.currency` | Tiền tệ | Currency | Table column |

**Khuyến nghị**: Giữ lại các key này. Chúng là chuẩn bị cho các tính năng chưa hoàn thiện (dashboard metrics, menu navigation, status tags). Xóa bớt sẽ gây MissingKey khi feature lần sau được kích hoạt.

---

## 3. Audit user frontend: keys unused (100 key)

User frontend có 100 key unused — tập trung vào các feature chưa được implement hết:

- **Bill creation** (9 key): `bill.title`, `bill.type.*`, `bill.amount`, `bill.content`, v.v.
- **Deposit flow** (12 key): `deposit.title`, `deposit.description`, `deposit.bill.*`, v.v.
- **Withdraw flow** (14 key): `withdraw.title`, `withdraw.accountName`, `withdraw.bankName`, v.v.
- **Validation messages** (11 key): `validation.required`, `validation.email`, `validation.pin.length`, v.v.
- **Wallet status/type** (7 key): `wallet.status.*`, `wallet.type.*`
- **Market volume** (1 key): `market.volume`
- **Landing features** (4 key): `landing.feature.*`
- **Common UI** (3 key): `common.empty`, `common.save`, `common.search`
- **Navigation** (5 key): `nav.dashboard`, `nav.bills`, `nav.settings`, `nav.wallet`, `nav.market`
- **Footer language** (1 key): `footer.language`
- **P2P autoRefresh** (2 key): `p2p.autoRefresh`, `p2p.refreshing`
- **Price history** (1 key): `price.history`
- **Auth/lock** (1 key): `lock.*` — một số key

**Khuyến nghị**: Tương tự admin, giữ lại các key này. User frontend vẫn đang phát triển, các feature như deposit/withdraw/bill creation sẽ cần các key này khi được implement.

---

## 4. Kiểm tra cách dùng useI18n()

Tất cả 38 component (19 admin + 19 user) sử dụng `useI18n()` đúng cách:

✅ Import đúng: `import { useI18n } from '@/lib/i18n'`
✅ Gọi hook đúng: `const { t } = useI18n()` hoặc `const { t, locale } = useI18n()`
✅ Dùng `t('key')` hoặc `t('key', { vars })`
✅ Không có component nào gọi `useI18n()` bên ngoài component function
✅ Không có component nào miss hook

**Lưu ý nhỏ**: Admin `translate()` function sử dụng `messages[locale][key]` trực tiếp (không optional chaining), khác với user frontend dùng `messages[locale]?.[key]`. Admin version an toàn vì `locale: Locale` được type-check, nhưng nếu muốn nhất quán có thể thêm `?.` cũng được.

---

## 5. Các vấn đề nhỏ cần lưu ý

### 5.1 Admin messages.ts — translate function thiếu fallback
```typescript
// Hiện tại (admin):
const template = messages[locale][key];  // sẽ throw nếu locale invalid

// User frontend dùng pattern an toàn hơn:
const template = messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
```
→ Không bắt buộc sửa vì `locale: Locale` đã được type-constraint, nhưng nên chuẩn hóa theo pattern của user frontend để defense-in-depth.

### 5.2 User frontend: key `@` false-positive
Trong audit dùng regex, key `@` xuất hiện do regex match sai từ `import { useI18n } from '@/lib/i18n'`. Không phải key thực tế, bỏ qua.

---

## 6. Đề xuất cấu trúc i18n cho user frontend (nếu cần mở rộng)

Hiện tại user frontend đã có cấu trúc tốt. Nếu sau này cần mở rộng:

```
src/lib/i18n/
├── messages.ts          # Trung tâm tất cả key (vi + en)
├── index.tsx            # I18nProvider + useI18n hook
├── LOCALES.ts           # (optional) tách constant ra
└── validation.ts        # (optional) tách validation messages nếu 길어짐
```

Với 210 key, file messages.ts còn manageable. Nếu độ dài vượt 500+ dòng, nên tách theo domain:
- `common.ts` — common UI strings
- `auth.ts` — authentication flow
- `wallet.ts` — wallet/deposit/withdraw
- `p2p.ts` — P2P trading
- `market.ts` — market/price

---

## 7. File đã xem xét

| File | Hành động |
|------|-----------|
| `okbong-admin-frontend/src/lib/i18n/messages.ts` | Audit — không sửa |
| `okbong-admin-frontend/src/lib/i18n/index.tsx` | Audit — không sửa |
| `okbong-user-frontend/src/lib/i18n/messages.ts` | Audit — không sửa |
| `okbong-user-frontend/src/lib/i18n/index.tsx` | Audit — không sửa |
| 38 component sử dụng useI18n | Audit — không sửa |

---

## 8. Kết luận

Không có lỗi i18n cần sửa. Cả hai frontend đều:
- Có đầy đủ EN translation cho mọi key
- Sử dụng useI18n() đúng cách
- Chưa có missing key hay unused-key gây lỗi runtime

Các key unused là trường hợp正常 — chúng là chuẩn bị cho tương lai, không nên xóa.
