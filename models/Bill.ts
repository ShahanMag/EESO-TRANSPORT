import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBill extends Document {
  type: "income" | "expense";
  name: string;
  totalAmount: number;
  paidAmount: number;
  date: Date;
  employeeId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const BillSchema: Schema<IBill> = new Schema(
  {
    type: {
      type: String,
      required: [true, "Bill type is required"],
      enum: {
        values: ["income", "expense"],
        message: "Type must be either income or expense",
      },
    },
    name: {
      type: String,
      required: [true, "Bill name is required"],
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    paidAmount: {
      type: Number,
      required: [true, "Paid amount is required"],
      min: [0, "Paid amount cannot be negative"],
      validate: {
        validator: function (this: IBill, value: number) {
          return value <= this.totalAmount;
        },
        message: "Paid amount cannot exceed total amount",
      },
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
BillSchema.index({ type: 1 }); // For filtering by income/expense
BillSchema.index({ employeeId: 1 }); // For filtering by employee
BillSchema.index({ date: -1 }); // For sorting by date (descending)
BillSchema.index({ type: 1, date: -1 }); // Compound index for type + date queries

// Virtual field for dues calculation
BillSchema.virtual("dues").get(function (this: IBill) {
  return this.totalAmount - this.paidAmount;
});

// Ensure virtuals are included in JSON
BillSchema.set("toJSON", { virtuals: true });
BillSchema.set("toObject", { virtuals: true });

// Prevent model recompilation in development
const Bill: Model<IBill> =
  mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);

export default Bill;
