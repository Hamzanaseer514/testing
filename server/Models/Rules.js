const mongoose = require("mongoose")

const RulesSchema = new mongoose.Schema({
  otp_rule_active: {
    type: Boolean,
    default: false,
    // required: true,
  },
});

const Rules = mongoose.model("Rules", RulesSchema);

module.exports = Rules;
