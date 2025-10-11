import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVehicle extends Document {
  number: string;
  name: string;
  serialNumber?: string;
  type: "private" | "public";
  vehicleModel?: string;
  vehicleAmount?: number;
  startDate?: Date;
  contractExpiry?: Date;
  description?: string;
  employeeId: mongoose.Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema: Schema<IVehicle> = new Schema(
  {
    number: {
      type: String,
      required: [true, "Vehicle number is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Vehicle name is required"],
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Vehicle type is required"],
      enum: {
        values: ["private", "public"],
        message: "Type must be either private or public",
      },
      default: "private",
    },
    vehicleModel: {
      type: String,
      trim: true,
    },
    vehicleAmount: {
      type: Number,
      min: [0, "Vehicle amount must be positive"],
    },
    startDate: {
      type: Date,
    },
    contractExpiry: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
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
VehicleSchema.index({ employeeId: 1 }); // For filtering by employee
VehicleSchema.index({ type: 1 }); // For filtering by vehicle type (private/public)
VehicleSchema.index({ createdAt: -1 }); // For date range filtering in reports
VehicleSchema.index({ isDeleted: 1 }); // For filtering soft-deleted records

// Query middleware to automatically filter out deleted records
VehicleSchema.pre(/^find/, function (next) {
  // @ts-ignore
  if (this.getQuery && !this.getQuery().hasOwnProperty('isDeleted')) {
    // @ts-ignore
    this.where({ isDeleted: false });
  }
  next();
});

// Prevent model recompilation in development
const Vehicle: Model<IVehicle> =
  mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
