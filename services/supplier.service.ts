import connectDB from "@/lib/db";
import { SupplierModel } from "@/models/supplier.model";
import { PurchaseModel } from "@/models/purchase.model";
import { LedgerEntryModel } from "@/models/ledger-entry.model";
import { Types } from "mongoose";
import { toPaisa } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import {
  SupplierCreateInput,
  SupplierUpdateInput,
} from "@/utils/zod-schemas";

export async function createSupplier(input: SupplierCreateInput) {
  await connectDB();
  return SupplierModel.create({
    ...input,
    openingBalance: toPaisa(input.openingBalance ?? 0),
  });
}

export async function updateSupplier(id: string, input: SupplierUpdateInput) {
  await connectDB();
  const update: Record<string, unknown> = { ...input };
  if (input.openingBalance !== undefined) {
    update.openingBalance = toPaisa(input.openingBalance);
  }
  const supplier = await SupplierModel.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });
  if (!supplier) businessError("Supplier not found");
  return supplier;
}

export async function softDeleteSupplier(id: string) {
  await connectDB();
  return SupplierModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
}

export async function listSuppliers(params: {
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

  const [suppliers, total] = await Promise.all([
    SupplierModel.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SupplierModel.countDocuments(query),
  ]);

  return { suppliers, total, page, limit };
}

export async function getSupplierById(id: string) {
  await connectDB();
  return SupplierModel.findById(id).lean();
}

export async function getSupplierBalance(supplierId: string): Promise<number> {
  await connectDB();
  const lastEntry = await LedgerEntryModel.findOne(
    { party: new Types.ObjectId(supplierId), partyType: "supplier" },
    { runningBalance: 1 },
    { sort: { createdAt: -1 } }
  ).lean();
  // runningBalance: positive = we owe supplier
  return lastEntry?.runningBalance ?? 0;
}

export async function getSupplierOutstandingBalances() {
  await connectDB();
  const result = await LedgerEntryModel.aggregate([
    { $match: { partyType: "supplier" } },
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
        from: "suppliers",
        localField: "_id",
        foreignField: "_id",
        as: "supplier",
      },
    },
    { $unwind: "$supplier" },
    {
      $project: {
        supplierId: "$_id",
        supplierName: "$supplier.name",
        phone: "$supplier.phone",
        outstandingBalance: "$latestBalance",
      },
    },
    { $sort: { outstandingBalance: -1 } },
  ]);
  return result;
}
