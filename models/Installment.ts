import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInstallment extends Document {
  paymentId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  remarks?: string;
  isDeleted: boolean;
  deletedAt?: Date;
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
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
InstallmentSchema.index({ isDeleted: 1 }); // For filtering soft-deleted records

// Query middleware to automatically filter out deleted records
InstallmentSchema.pre(/^find/, function (next) {
  // @ts-ignore
  if (this.getQuery && !this.getQuery().hasOwnProperty('isDeleted')) {
    // @ts-ignore
    this.where({ isDeleted: false });
  }
  next();
});

// Prevent model recompilation in development
const Installment: Model<IInstallment> =
  mongoose.models.Installment || mongoose.model<IInstallment>("Installment", InstallmentSchema);

export default Installment;
