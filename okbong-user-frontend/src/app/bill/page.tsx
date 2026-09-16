'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BillPage() {
  const router = useRouter();

  useEffect(() => {
    // Chức năng tạo hoá đơn đã bị loại bỏ, chuyển hướng về trang chủ Giao dịch Nhanh
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="mt-3 text-sm text-gray-500">Đang chuyển hướng đến Giao dịch Nhanh P2P...</p>
      </div>
    </div>
  );
}
