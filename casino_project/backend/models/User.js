const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "A felhasználónév megadása kötelező."],
      unique: true,
      trim: true,
      minlength: [3, "A felhasználónév legalább 3 karakter legyen."],
      maxlength: [30, "A felhasználónév legfeljebb 30 karakter lehet."],
    },

    email: {
      type: String,
      required: [true, "Az e-mail-cím megadása kötelező."],
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: [true, "A jelszó megadása kötelező."],
      minlength: [8, "A jelszó legalább 8 karakter legyen."],
      select: false,
    },

    balance: {
      type: Number,
      default: 10000,
      required: true,
      min: [0, "Az egyenleg nem lehet negatív."],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const saltRounds = 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};
module.exports = mongoose.model("User", userSchema);