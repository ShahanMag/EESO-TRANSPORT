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
      validate: {
        validator: function (v: string) {
          return /^[A-Z]{3}-\d{4}$/.test(v);
        },
        message: "Vehicle number must be in format ABC-1234",
      },
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
