import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      maxlength: 254,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address."],
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    educationLevel: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    examTarget: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    dailyStudyHours: {
      type: Number,
      default: 2,
      min: 0.5,
      max: 24,
    },
    preferredStudyTime: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    delete returnedObject.password;
    return returnedObject;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
