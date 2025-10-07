import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVehicle extends Document {
  number: string;
  name: string;
  employeeId: mongoose.Types.ObjectId | null;
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

// Prevent model recompilation in development
const Vehicle: Model<IVehicle> =
  mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
