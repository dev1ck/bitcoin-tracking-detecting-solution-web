import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  // password: {
  //   type: String,
  //   require: true,
  // },
  tab: {
    type: [String],
  },
  // alias: {
  //   type: String,
  // },
  // metadata: {
  //   type: {
  //     date_created: Date,
  //     date_last_login: Date,
  //   },
  //   require: true,
  // },
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
