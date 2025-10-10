import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInstallment extends Document {
  paymentId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InstallmentSchema: Schema<IInstallment> = new Schema(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: [true, "Payment is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
InstallmentSchema.index({ paymentId: 1 }); // For filtering by payment
InstallmentSchema.index({ date: -1 }); // For sorting by date (descending)
InstallmentSchema.index({ paymentId: 1, date: -1 }); // Compound index for payment + date queries

// Prevent model recompilation in development
const Installment: Model<IInstallment> =
  mongoose.models.Installment || mongoose.model<IInstallment>("Installment", InstallmentSchema);

export default Installment;
