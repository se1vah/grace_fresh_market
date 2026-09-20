import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyShopToken, SHOP_COOKIE_NAME } from '@/lib/auth/shop-jwt';

interface OrderStatRow {
  id: number;
  total: unknown;
  createdAt: string | Date;
  current_status: string;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SHOP_COOKIE_NAME)?.value;
    const user = token ? await verifyShopToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const rawYear = searchParams.get('year') ? Number(searchParams.get('year')) : currentYear;
    const rawMonth = searchParams.get('month') ? Number(searchParams.get('month')) : currentMonth;

    const selectedYear = Number.isInteger(rawYear) && rawYear >= 2026 ? rawYear : currentYear;
    const selectedMonth = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : currentMonth;

    // 1. Category Stats
    const catRows = await query<any[]>('SELECT COUNT(*) as total FROM categories');
    const totalCategories = catRows[0]?.total ? Number(catRows[0].total) : 0;

    const activeCatRows = await query<any[]>("SELECT COUNT(*) as total FROM categories WHERE status = 'active'");
    const activeCategories = activeCatRows[0]?.total ? Number(activeCatRows[0].total) : 0;

    // 2. SubCategory Stats
    const subRows = await query<any[]>(
      `SELECT COUNT(*) as total 
       FROM subcategories s 
       JOIN categories c ON s.category_id = c.id 
       WHERE c.status = 'active'`
    );
    const totalSubCategories = subRows[0]?.total ? Number(subRows[0].total) : 0;

    const activeSubRows = await query<any[]>(
      `SELECT COUNT(*) as total 
       FROM subcategories s 
       JOIN categories c ON s.category_id = c.id 
       WHERE s.status = 'active' AND c.status = 'active'`
    );
    const activeSubCategories = activeSubRows[0]?.total ? Number(activeSubRows[0].total) : 0;

    // 3. Customer Stats
    let totalCustomers = 0;
    let activeShoppers = 0;
    let newCustomersThisMonth = 0;

    try {
      const userRows = await query<any[]>('SELECT id, created_at FROM users');
      if (Array.isArray(userRows)) {
        totalCustomers = userRows.length;
        for (const u of userRows) {
          if (u.created_at) {
            const d = new Date(u.created_at);
            if (d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth) {
              newCustomersThisMonth++;
            }
          }
        }
      }

      const activeCustRows = await query<any[]>('SELECT COUNT(DISTINCT userId) as total FROM `Order`');
      if (activeCustRows && activeCustRows[0]) {
        activeShoppers = Number(activeCustRows[0].total) || 0;
      }
    } catch (custErr) {
      console.warn('Error querying customer stats:', custErr);
    }

    // 4. Orders & Earnings Stats
    const orderRows = await query<OrderStatRow[]>(
      `SELECT 
         o.id,
         o.total,
         o.createdAt,
         COALESCE(latest_status.status, 'ordered') as current_status
       FROM \`Order\` o
       LEFT JOIN (
           SELECT os1.orderId, os1.status
           FROM OrderStatus os1
           INNER JOIN (
               SELECT orderId, MAX(id) AS max_id
               FROM OrderStatus
               GROUP BY orderId
           ) os2 ON os1.id = os2.max_id
       ) latest_status ON o.id = latest_status.orderId
       ORDER BY o.id DESC`
    );

    let totalOrders = 0;
    let orderedCount = 0;
    let packedCount = 0;
    let outForDeliveryCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;

    let totalEarnings = 0;
    let deliveredEarnings = 0;
    let pendingEarnings = 0;

    // Days in the selected month
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthDaysMap: Record<number, { day: number; date: string; dayName: string; revenue: number; ordersCount: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonth - 1, d);
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      monthDaysMap[d] = {
        day: d,
        date: dateStr,
        dayName,
        revenue: 0,
        ordersCount: 0,
      };
    }

    let monthTotalRevenue = 0;
    let monthTotalOrders = 0;

    if (Array.isArray(orderRows)) {
      totalOrders = orderRows.length;

      for (const row of orderRows) {
        const amount = Number(row.total) || 0;
        const status = String(row.current_status || '').toLowerCase().trim();

        if (status === 'ordered' || status === 'orderd') {
          orderedCount++;
          pendingEarnings += amount;
          totalEarnings += amount;
        } else if (status === 'packed') {
          packedCount++;
          pendingEarnings += amount;
          totalEarnings += amount;
        } else if (status === 'out for delivery') {
          outForDeliveryCount++;
          pendingEarnings += amount;
          totalEarnings += amount;
        } else if (status === 'delivered' || status === 'deliverd' || status === 'delivery') {
          deliveredCount++;
          deliveredEarnings += amount;
          totalEarnings += amount;
        } else if (status === 'cancelled') {
          cancelledCount++;
        } else {
          orderedCount++;
          pendingEarnings += amount;
          totalEarnings += amount;
        }

        // Map order into the selected year and month if not cancelled
        if (status !== 'cancelled' && row.createdAt) {
          try {
            const d = new Date(row.createdAt);
            if (d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth) {
              const dayNum = d.getDate();
              if (monthDaysMap[dayNum]) {
                monthDaysMap[dayNum].revenue = Number((monthDaysMap[dayNum].revenue + amount).toFixed(2));
                monthDaysMap[dayNum].ordersCount += 1;
                monthTotalRevenue += amount;
                monthTotalOrders += 1;
              }
            }
          } catch {}
        }
      }
    }

    const nonCancelledOrders = totalOrders - cancelledCount;
    const avgOrderValue = nonCancelledOrders > 0 ? totalEarnings / nonCancelledOrders : 0;
    const monthDays = Object.values(monthDaysMap);

    return NextResponse.json({
      success: true,
      // Categories
      totalCategories,
      activeCategories,
      inactiveCategories: totalCategories - activeCategories,
      totalSubCategories,
      activeSubCategories,
      inactiveSubCategories: totalSubCategories - activeSubCategories,

      // Orders & Earnings
      orders: {
        total: totalOrders,
        ordered: orderedCount,
        packed: packedCount,
        outForDelivery: outForDeliveryCount,
        delivered: deliveredCount,
        cancelled: cancelledCount,
        activeOrders: orderedCount + packedCount + outForDeliveryCount,
      },
      earnings: {
        totalRevenue: Number(totalEarnings.toFixed(2)),
        deliveredRevenue: Number(deliveredEarnings.toFixed(2)),
        pendingRevenue: Number(pendingEarnings.toFixed(2)),
        averageOrderValue: Number(avgOrderValue.toFixed(2)),
      },

      // Customers
      customers: {
        total: totalCustomers,
        activeShoppers,
        newThisMonth: newCustomersThisMonth,
        noOrdersCount: Math.max(0, totalCustomers - activeShoppers),
      },

      // Selected Month & Days Data for Chart
      selectedYear,
      selectedMonth,
      monthRevenue: Number(monthTotalRevenue.toFixed(2)),
      monthOrdersCount: monthTotalOrders,
      monthDays,
    });
  } catch (error: any) {
    console.error('Error fetching shop stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
