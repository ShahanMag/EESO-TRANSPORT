import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  vehicleId: mongoose.Types.ObjectId;
  totalAmount: number;
  date: Date;
  remarks?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema<IPayment> = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "Vehicle is required"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
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
PaymentSchema.index({ vehicleId: 1 }); // For filtering by vehicle
PaymentSchema.index({ date: -1 }); // For sorting by date (descending)
PaymentSchema.index({ vehicleId: 1, date: -1 }); // Compound index for vehicle + date queries
PaymentSchema.index({ isDeleted: 1 }); // For filtering soft-deleted records

// Query middleware to automatically filter out deleted records
PaymentSchema.pre(/^find/, function (next) {
  // @ts-ignore
  if (this.getQuery && !this.getQuery().hasOwnProperty('isDeleted')) {
    // @ts-ignore
    this.where({ isDeleted: false });
  }
  next();
});

// Prevent model recompilation in development
const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
