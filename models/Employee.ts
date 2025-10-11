import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmployee extends Document {
  name: string;
  iqamaId: string;
  phone?: string;
  type: "employee" | "agent";
  joinDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema<IEmployee> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    iqamaId: {
      type: String,
      required: [true, "Iqama ID is required"],
      unique: true,
      validate: {
        validator: function (v: string) {
          return /^\d{10}$/.test(v);
        },
        message: "Iqama ID must be exactly 10 digits",
      },
    },
    phone: {
      type: String,
      required: false,
      validate: {
        validator: function (v: string) {
          // Allow empty/null values, but if provided, must match format
          if (!v || v === "") return true;
          return /^\+966\d{9}$/.test(v);
        },
        message: "Phone number must be in format +966XXXXXXXXX",
      },
    },
    type: {
      type: String,
      required: [true, "Employee type is required"],
      enum: {
        values: ["employee", "agent"],
        message: "Type must be either employee or agent",
      },
    },
    joinDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query optimization
EmployeeSchema.index({ type: 1 }); // For filtering by employee type (employee/agent)

// Prevent model recompilation in development
const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
