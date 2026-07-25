import connectDB from "@/lib/db";
import { CustomerModel } from "@/models/customer.model";
import { SaleModel } from "@/models/sale.model";
import { LedgerEntryModel } from "@/models/ledger-entry.model";
import { Types } from "mongoose";
import { toPaisa } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import {
  CustomerCreateInput,
  CustomerUpdateInput,
} from "@/utils/zod-schemas";

export async function createCustomer(input: CustomerCreateInput) {
  await connectDB();
  return CustomerModel.create({
    ...input,
    openingBalance: toPaisa(input.openingBalance ?? 0),
  });
}

export async function updateCustomer(id: string, input: CustomerUpdateInput) {
  await connectDB();
  const update: Record<string, unknown> = { ...input };
  if (input.openingBalance !== undefined) {
    update.openingBalance = toPaisa(input.openingBalance);
  }
  const customer = await CustomerModel.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });
  if (!customer) businessError("Customer not found");
  return customer;
}

export async function softDeleteCustomer(id: string) {
  await connectDB();
  // Guard: check if this customer has any existing sales
  const salesCount = await SaleModel.countDocuments({ customerId: id });
  if (salesCount > 0) {
    // Has transactions — soft delete only
    return CustomerModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }
  // No transactions — safe to hard delete (but we still soft delete for consistency)
  return CustomerModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
}

export async function listCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeInactive?: boolean;
}) {
  await connectDB();
  const {
    page = 1,
    limit = 20,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
    includeInactive = false,
  } = params;

  const query: Record<string, unknown> = {};
  if (!includeInactive) query.isActive = true;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const sort: Record<string, 1 | -1> = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const [customers, total] = await Promise.all([
    CustomerModel.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CustomerModel.countDocuments(query),
  ]);

  return { customers, total, page, limit };
}

export async function getCustomerById(id: string) {
  await connectDB();
  return CustomerModel.findById(id).lean();
}

/** Get customer's outstanding balance from ledger */
export async function getCustomerBalance(customerId: string): Promise<number> {
  await connectDB();
  const lastEntry = await LedgerEntryModel.findOne(
    { party: new Types.ObjectId(customerId), partyType: "customer" },
    { runningBalance: 1 },
    { sort: { createdAt: -1 } }
  ).lean();
  // runningBalance: positive = customer owes us
  return lastEntry?.runningBalance ?? 0;
}

/** Aggregate outstanding balances for all customers (for reports) */
export async function getCustomerOutstandingBalances() {
  await connectDB();
  const result = await LedgerEntryModel.aggregate([
    { $match: { partyType: "customer" } },
    { $sort: { party: 1, createdAt: -1 } },
    {
      $group: {
        _id: "$party",
        latestBalance: { $first: "$runningBalance" },
      },
    },
    { $match: { latestBalance: { $gt: 0 } } },
    {
      $lookup: {
        from: "customers",
        localField: "_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
    {
      $project: {
        customerId: "$_id",
        customerName: "$customer.name",
        phone: "$customer.phone",
        outstandingBalance: "$latestBalance",
      },
    },
    { $sort: { outstandingBalance: -1 } },
  ]);
  return result;
}
