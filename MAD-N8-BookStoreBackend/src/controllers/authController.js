const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bookstore_secret_dev';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const authController = {
  register: async (req, res) => {
    const { email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.status(400).json({ message: "Password confirmation does not match" });

    try {
      const { data: existingUser } = await supabase.from('Customer').select('customerID').eq('email', email).maybeSingle();
      if (existingUser) return res.status(400).json({ message: "Email is already in use" });

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Avoid Postgres sequence mismatch by generating the next ID manually
      const { data: maxIdRecord } = await supabase.from('Customer')
        .select('customerID')
        .order('customerID', { ascending: false })
        .limit(1)
        .maybeSingle();
      const newCustomerId = (maxIdRecord && maxIdRecord.customerID) ? maxIdRecord.customerID + 1 : 1;

      const { data: newUser, error } = await supabase.from('Customer')
        .insert([{ customerID: newCustomerId, email, password: hashedPassword, fullName: email.split('@')[0], joinDay: new Date(), phoneNumber: "" }])
        .select().single();
      if (error) throw error;

      // Sinh OTP
      const otpCode = generateOTP();
      const expiredAt = new Date(Date.now() + 5 * 60000); // 5 mins
      await supabase.from('OTP').insert([{ otpCode, idCustomer: newUser.customerID, expiredAt }]);

      console.log(`[SIMULATED EMAIL TO ${email}] Your registration OTP is: ${otpCode}`);

      res.status(201).json({ message: "Registration successful. OTP has been sent to your email." });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;
    try {
      const { data: user } = await supabase.from('Customer').select('*').eq('email', email).maybeSingle();
      if (!user) return res.status(400).json({ message: "Email or password is incorrect" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Email or password is incorrect" });

      const token = jwt.sign({ customerID: user.customerID, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.status(200).json({ 
        message: "Login successful", 
        token, 
        user: { customerID: user.customerID, email: user.email, fullName: user.fullName } 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  forgotPassword: async (req, res) => {
    const { email } = req.body;
    try {
      const { data: user } = await supabase.from('Customer').select('customerID').eq('email', email).maybeSingle();
      if (!user) return res.status(404).json({ message: "Email was not found" });

      const otpCode = generateOTP();
      const expiredAt = new Date(Date.now() + 5 * 60000);
      await supabase.from('OTP').insert([{ otpCode, idCustomer: user.customerID, expiredAt }]);

      console.log(`[SIMULATED EMAIL TO ${email}] Your password reset OTP is: ${otpCode}`);
      
      res.status(200).json({ message: "OTP has been sent to your email" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  verifyOtp: async (req, res) => {
    const { email, otpCode } = req.body;
    try {
      const { data: user } = await supabase.from('Customer').select('customerID').eq('email', email).maybeSingle();
      if (!user) return res.status(404).json({ message: "Email does not exist" });

      const { data: otpRecords, error } = await supabase.from('OTP')
        .select('*')
        .eq('idCustomer', user.customerID)
        .order('expiredAt', { ascending: false })
        .limit(1);

      if (error || !otpRecords || otpRecords.length === 0) return res.status(400).json({ message: "OTP was not found" });
      
      const latestOtp = otpRecords[0];
      if (latestOtp.otpCode !== otpCode) return res.status(400).json({ message: "OTP is incorrect" });
      if (new Date(latestOtp.expiredAt) < new Date()) return res.status(400).json({ message: "OTP has expired" });

      // Return a short-lived token for the next password reset step
      const resetToken = jwt.sign({ customerID: user.customerID, email, isReset: true }, JWT_SECRET, { expiresIn: '15m' });

      res.status(200).json({ message: "OTP verified successfully", resetToken });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  changePassword: async (req, res) => {
    const { oldPassword, newPassword, confirmPassword, resetToken } = req.body;
    if (newPassword !== confirmPassword) return res.status(400).json({ message: "Password confirmation does not match" });

    try {
      let customerId;
      if (resetToken) {
        // Password reset flow after OTP verification
        const decoded = jwt.verify(resetToken, JWT_SECRET);
        if (!decoded.isReset) return res.status(400).json({ message: "Token is not valid for password reset" });
        customerId = decoded.customerID;
      } else {
        // Password change flow while logged in from profile
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Please log in to change your password" });
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        customerId = decoded.customerID;

        const { data: user } = await supabase.from('Customer').select('password').eq('customerID', customerId).single();
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await supabase.from('Customer').update({ password: hashedPassword }).eq('customerID', customerId);

      res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = authController;