import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  vehicleId: mongoose.Types.ObjectId;
  totalAmount: number;
  paidAmount: number;
  date: Date;
  remarks?: string;
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
    paidAmount: {
      type: Number,
      required: [true, "Paid amount is required"],
      min: [0, "Paid amount cannot be negative"],
      validate: {
        validator: function (this: IPayment, value: number) {
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
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for dues calculation
PaymentSchema.virtual("dues").get(function (this: IPayment) {
  return this.totalAmount - this.paidAmount;
});

// Ensure virtuals are included in JSON
PaymentSchema.set("toJSON", { virtuals: true });
PaymentSchema.set("toObject", { virtuals: true });

// Prevent model recompilation in development
const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
