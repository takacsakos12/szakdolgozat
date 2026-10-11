const mongoose = require("mongoose");

const provablyFairSeedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    serverSeed: {
      type: String,
      required: true,
      select: false,
      minlength: 64,
      maxlength: 64,
      match: [/^[a-f0-9]{64}$/, "A szerverseed formátuma érvénytelen."],
    },

    serverSeedHash: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      lowercase: true,
      minlength: 64,
      maxlength: 64,
      match: [/^[a-f0-9]{64}$/, "A szerverseed hash formátuma érvénytelen."],
    },

    clientSeed: {
      type: String,
      required: true,
      trim: true,
      minlength: [1, "A kliensseed nem lehet üres."],
      maxlength: [128, "A kliensseed legfeljebb 128 karakter lehet."],
    },

    nonce: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "A nonce nem lehet negatív."],
      validate: {
        validator: Number.isSafeInteger,
        message: "A nonce csak biztonságosan ábrázolható egész szám lehet.",
      },
    },

    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "REVEALED"],
      default: "ACTIVE",
    },

    algorithmVersion: {
      type: String,
      required: true,
      default: "HMAC_SHA512_V1",
      immutable: true,
    },

    revealedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

provablyFairSeedSchema.index(
  {
    userId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "ACTIVE",
    },
  },
);

provablyFairSeedSchema.index({
  userId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("ProvablyFairSeed", provablyFairSeedSchema);
