// src/components/payments/TransactionHistory.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TransactionWithDetails } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  Package,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface TransactionHistoryProps {
  role?: "buyer" | "seller" | "both";
  limit?: number;
}

export default function TransactionHistory({
  role = "both",
  limit = 20,
}: TransactionHistoryProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total_sales: number;
    total_earnings: number;
    total_platform_fees: number;
    transaction_count: number;
  } | null>(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      if (role === "seller" || role === "both") {
        fetchSellerStats();
      }
    }
  }, [user, role]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/transactions?role=${role}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerStats = async () => {
    try {
      const response = await fetch("/api/transactions/stats");

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "pending":
      case "processing":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "refunded":
        return <RefreshCw className="h-5 w-5 text-gray-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="ml-3">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards (for sellers) */}
      {stats && (role === "seller" || role === "both") && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<DollarSign className="h-8 w-8 text-green-600" />}
            title="Total Sales"
            value={formatPrice(stats.total_sales / 100)}
            subtitle={`${stats.transaction_count} transactions`}
          />
          <StatCard
            icon={<TrendingUp className="h-8 w-8 text-blue-600" />}
            title="Net Earnings"
            value={formatPrice(stats.total_earnings / 100)}
            subtitle="After platform fees"
          />
          <StatCard
            icon={<Package className="h-8 w-8 text-purple-600" />}
            title="Platform Fees"
            value={formatPrice(stats.total_platform_fees / 100)}
            subtitle="10% of sales"
          />
          <StatCard
            icon={<ShoppingBag className="h-8 w-8 text-orange-600" />}
            title="Items Sold"
            value={stats.transaction_count.toString()}
            subtitle="Total items"
          />
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Transaction History
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No transactions yet</p>
            <p className="text-sm text-gray-500 mt-1">
              {role === "seller"
                ? "Your sales will appear here"
                : role === "buyer"
                ? "Your purchases will appear here"
                : "Your transactions will appear here"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.post_title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.buyer_id === user?.id
                            ? `Seller: ${transaction.seller_email}`
                            : `Buyer: ${transaction.buyer_email}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.buyer_id === user?.id
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {transaction.buyer_id === user?.id
                          ? "Purchase"
                          : "Sale"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(transaction.status)}
                        <span className="ml-2 text-sm text-gray-900">
                          {getStatusText(transaction.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatPrice(transaction.amount / 100)}
                        </p>
                        {transaction.seller_id === user?.id && (
                          <p className="text-xs text-gray-500">
                            Net: {formatPrice(transaction.seller_amount / 100)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}

function StatCard({ icon, title, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">{icon}</div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
