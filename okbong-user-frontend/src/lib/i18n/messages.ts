export const LOCALES = ['vi', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'vi';

export const LOCALE_LABELS: Record<Locale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
};

const vi = {
  'app.name': 'Billdayroi',
  'app.tagline': 'Tạo và quản lý hoá đơn của bạn trong vài giây.',

  'common.loading': 'Đang tải…',
  'common.retry': 'Thử lại',
  'common.close': 'Đóng',
  'common.cancel': 'Huỷ',
  'common.save': 'Lưu',
  'common.search': 'Tìm kiếm',
  'common.empty': 'Chưa có dữ liệu',
  'common.error': 'Đã xảy ra lỗi, vui lòng thử lại.',

  'nav.dashboard': 'Bảng điều khiển',
  'nav.price': 'Giá',
  'nav.bills': 'Hoá đơn',
  'nav.login': 'Đăng nhập',
  'nav.logout': 'Đăng xuất',
  'nav.menu': 'Trình đơn',
  'nav.theme.toggle': 'Đổi giao diện sáng/tối',
  'nav.language.toggle': 'Đổi ngôn ngữ',

  'landing.welcome': 'Chào mừng đến với Billdayroi',
  'landing.subtitle':
    'Cách nhanh nhất để tạo và quản lý hoá đơn. Tham gia cùng hàng nghìn người dùng hài lòng.',
  'landing.login': 'Đăng nhập',
  'landing.register': 'Đăng ký',
  'landing.feature.fast.title': 'Tạo tức thì',
  'landing.feature.fast.body': 'Tạo hoá đơn chỉ trong một bước, không cần cấu hình.',
  'landing.feature.secure.title': 'An toàn',
  'landing.feature.secure.body': 'Xác thực JWT, phân quyền theo vai trò cho mọi yêu cầu.',
  'landing.feature.multichannel.title': 'Đa kênh',
  'landing.feature.multichannel.body': 'Ví điện tử, ngân hàng, biến động giá và hoá đơn ưu tiên.',

  'auth.login.title': 'Đăng nhập',
  'auth.register.title': 'Đăng ký',
  'auth.email': 'Email',
  'auth.email.placeholder': 'ten@vidu.com',
  'auth.password': 'Mật khẩu',
  'auth.password.placeholder': 'Ít nhất 6 ký tự',
  'auth.confirmPassword': 'Nhập lại mật khẩu',
  'auth.fullName': 'Họ và tên',
  'auth.fullName.placeholder': 'Nguyễn Văn A',
  'auth.signIn': 'Đăng nhập',
  'auth.createAccount': 'Tạo tài khoản',
  'auth.noAccount': 'Chưa có tài khoản?',
  'auth.hasAccount': 'Đã có tài khoản?',
  'auth.switchToRegister': 'Đăng ký',
  'auth.switchToLogin': 'Đăng nhập',
  'auth.success.login': 'Đăng nhập thành công. Đang chuyển hướng…',
  'auth.success.register': 'Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.',
  'auth.error.invalid': 'Email hoặc mật khẩu không đúng.',

  'validation.required': 'Trường này là bắt buộc.',
  'validation.email': 'Email không hợp lệ.',
  'validation.password.min': 'Mật khẩu phải có ít nhất 6 ký tự.',
  'validation.password.max': 'Mật khẩu không được vượt quá 50 ký tự.',
  'validation.amount.invalid': 'Số tiền phải là số lớn hơn 0.',
  'validation.amount.max': 'Số tiền không được vượt quá 1.000.000.000.',
  'validation.content.min': 'Nội dung phải có ít nhất 3 ký tự.',
  'validation.content.max': 'Nội dung không được vượt quá 255 ký tự.',
  'validation.pin.length': 'Mã PIN phải gồm đúng 4 chữ số.',

  'dashboard.title': 'Bảng điều khiển',
  'dashboard.balance': 'Số dư',
  'dashboard.transactions': 'Giao dịch',
  'dashboard.transactions.count': '{count} giao dịch',
  'dashboard.bills': 'Hoá đơn',
  'dashboard.bills.count': '{count} hoá đơn',
  'dashboard.recentBills': 'Hoá đơn gần đây',
  'dashboard.error': 'Không tải được dữ liệu ví. Vui lòng thử lại.',
  'dashboard.empty': 'Bạn chưa có hoá đơn nào.',

  'bill.title': 'Tạo hoá đơn',
  'bill.type': 'Loại hoá đơn',
  'bill.type.transfer': 'Chuyển khoản',
  'bill.type.e-wallet': 'Ví điện tử',
  'bill.type.fluctuation': 'Biến động giá',
  'bill.type.priority': 'Ưu tiên',
  'bill.amount': 'Số tiền (BDSD)',
  'bill.amount.placeholder': '0',
  'bill.content': 'Nội dung / tham chiếu',
  'bill.content.placeholder': 'Tên ngân hàng hoặc địa chỉ ví',
  'bill.submit': 'Tạo hoá đơn',
  'bill.submitting': 'Đang gửi…',
  'bill.success': 'Đã tạo hoá đơn {id}.',
  'bill.recent': 'Hoá đơn đã tạo gần đây',

  'status.bill.draft': 'Nháp',
  'status.bill.pending': 'Chờ xử lý',
  'status.bill.processing': 'Đang xử lý',
  'status.bill.completed': 'Hoàn tất',
  'status.bill.cancelled': 'Đã huỷ',

  'price.title': 'Biến động giá',
  'price.current': 'Giá hiện tại',
  'price.reset': 'Đặt lại',
  'price.history': 'Lịch sử giá',
  'price.chartLabel': 'Biểu đồ giá {symbol}',
  'price.symbol': 'Cặp giao dịch',
  'price.offline': 'Không kết nối được máy chủ — đang hiển thị dữ liệu mô phỏng.',

  'lock.title': 'Màn hình khoá',
  'lock.pin': 'Nhập mã PIN',
  'lock.pin.placeholder': '••••',
  'lock.unlock': 'Mở khoá',
  'lock.error': 'Mã PIN không đúng.',

  'validation.password.mismatch': 'Mật khẩu nhập lại không khớp.',
  'footer.rights': '2026 OKBong - Bảo lưu mọi quyền.',
  'footer.language': 'Ngôn ngữ',
} as const;

export type MessageKey = keyof typeof vi;

const en: Record<MessageKey, string> = {
  'app.name': 'Billdayroi',
  'app.tagline': 'Create and manage your bills in seconds.',

  'common.loading': 'Loading…',
  'common.retry': 'Retry',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.search': 'Search',
  'common.empty': 'Nothing here yet',
  'common.error': 'Something went wrong, please try again.',

  'nav.dashboard': 'Dashboard',
  'nav.price': 'Price',
  'nav.bills': 'Bills',
  'nav.login': 'Login',
  'nav.logout': 'Logout',
  'nav.menu': 'Menu',
  'nav.theme.toggle': 'Toggle light/dark theme',
  'nav.language.toggle': 'Change language',

  'landing.welcome': 'Welcome to Billdayroi',
  'landing.subtitle':
    'The fastest way to generate and manage your bills. Join thousands of satisfied users.',
  'landing.login': 'Login',
  'landing.register': 'Register',
  'landing.feature.fast.title': 'Instant generation',
  'landing.feature.fast.body': 'Create a bill in a single step, no setup required.',
  'landing.feature.secure.title': 'Secure',
  'landing.feature.secure.body': 'JWT authentication and role based access on every request.',
  'landing.feature.multichannel.title': 'Multi channel',
  'landing.feature.multichannel.body': 'E-wallet, bank, price fluctuation and priority bills.',

  'auth.login.title': 'Login',
  'auth.register.title': 'Register',
  'auth.email': 'Email',
  'auth.email.placeholder': 'john@example.com',
  'auth.password': 'Password',
  'auth.password.placeholder': 'At least 6 characters',
  'auth.confirmPassword': 'Confirm password',
  'auth.fullName': 'Full name',
  'auth.fullName.placeholder': 'John Doe',
  'auth.signIn': 'Sign In',
  'auth.createAccount': 'Create Account',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  'auth.switchToRegister': 'Register',
  'auth.switchToLogin': 'Login',
  'auth.success.login': 'Login successful. Redirecting…',
  'auth.success.register': 'Account created. You can sign in now.',
  'auth.error.invalid': 'Incorrect email or password.',

  'validation.required': 'This field is required.',
  'validation.email': 'Invalid email address.',
  'validation.password.min': 'Password must be at least 6 characters.',
  'validation.password.max': 'Password must not exceed 50 characters.',
  'validation.password.mismatch': 'The passwords do not match.',
  'validation.amount.invalid': 'Amount must be a number greater than 0.',
  'validation.amount.max': 'Amount must not exceed 1,000,000,000.',
  'validation.content.min': 'Content must be at least 3 characters.',
  'validation.content.max': 'Content must not exceed 255 characters.',
  'validation.pin.length': 'PIN must contain exactly 4 digits.',

  'dashboard.title': 'Dashboard',
  'dashboard.balance': 'Balance',
  'dashboard.transactions': 'Transactions',
  'dashboard.transactions.count': '{count} transactions',
  'dashboard.bills': 'Bills',
  'dashboard.bills.count': '{count} bills',
  'dashboard.recentBills': 'Recent Bills',
  'dashboard.error': 'Could not load wallet data. Please retry.',
  'dashboard.empty': 'You have no bills yet.',

  'bill.title': 'Create Bill',
  'bill.type': 'Bill Type',
  'bill.type.transfer': 'Transfer',
  'bill.type.e-wallet': 'E-Wallet',
  'bill.type.fluctuation': 'Fluctuation',
  'bill.type.priority': 'Priority',
  'bill.amount': 'Amount (BDSD)',
  'bill.amount.placeholder': '0',
  'bill.content': 'Content/Reference',
  'bill.content.placeholder': 'Bank name or wallet address',
  'bill.submit': 'Generate Bill',
  'bill.submitting': 'Submitting…',
  'bill.success': 'Bill {id} created.',
  'bill.recent': 'Recently created bills',

  'status.bill.draft': 'Draft',
  'status.bill.pending': 'Pending',
  'status.bill.processing': 'Processing',
  'status.bill.completed': 'Completed',
  'status.bill.cancelled': 'Cancelled',

  'price.title': 'Price Fluctuation',
  'price.current': 'Current price',
  'price.reset': 'Reset',
  'price.history': 'Price history',
  'price.chartLabel': 'Price chart for {symbol}',
  'price.symbol': 'Symbol',
  'price.offline': 'Server unreachable — showing simulated data.',

  'lock.title': 'Lock Screen',
  'lock.pin': 'Enter PIN',
  'lock.pin.placeholder': '••••',
  'lock.unlock': 'Unlock',
  'lock.error': 'Incorrect PIN.',

  'footer.rights': '2026 OKBong - All rights reserved.',
  'footer.language': 'Language',
};

export const messages: Record<Locale, Record<MessageKey, string>> = { vi, en };

/** Resolves a message key and interpolates `{placeholder}` variables. */
export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return template;

  return Object.entries(vars).reduce(
    (acc, [name, value]) => acc.split(`{${name}}`).join(String(value)),
    template,
  );
}

