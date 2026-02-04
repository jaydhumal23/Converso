// import React, { useState, useContext } from 'react';
// import { AuthContext } from '../../context/AuthContext';

// const Register = ({ onLoginClick }) => {
//     const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
//     const [error, setError] = useState('');
//     const [loading, setLoading] = useState(false);
//     const { register } = useContext(AuthContext);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setError('');

//         if (formData.password !== formData.confirmPassword) {
//             setError('Passwords do not match');
//             return;
//         }

//         if (formData.password.length < 6) {
//             setError('Password must be at least 6 characters');
//             return;
//         }

//         setLoading(true);
//         try {
//             await register({
//                 username: formData.username,
//                 email: formData.email,
//                 password: formData.password,
//             });
//         } catch (err) {
//             setError(err.message);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
//             {/* Animated background */}
//             <div className="absolute inset-0 overflow-hidden pointer-events-none">
//                 <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
//                 <div className="absolute w-96 h-96 bg-pink-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
//             </div>

//             <div className="relative bg-white/5 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-2xl">
//                 <div className="text-center mb-8">
//                     <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
//                     <p className="text-gray-400">Join the community</p>
//                 </div>

//                 {error && (
//                     <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
//                         {error}
//                     </div>
//                 )}

//                 <form onSubmit={handleSubmit} className="space-y-5">
//                     <div>
//                         <label className="block text-white/90 mb-2 text-sm font-medium">Username</label>
//                         <input
//                             type="text"
//                             value={formData.username}
//                             onChange={(e) => setFormData({ ...formData, username: e.target.value })}
//                             required
//                             className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
//                             placeholder="jay"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-white/90 mb-2 text-sm font-medium">Email</label>
//                         <input
//                             type="email"
//                             value={formData.email}
//                             onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//                             required
//                             className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
//                             placeholder="jay@me.com"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-white/90 mb-2 text-sm font-medium">Password</label>
//                         <input
//                             type="password"
//                             value={formData.password}
//                             onChange={(e) => setFormData({ ...formData, password: e.target.value })}
//                             required
//                             className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
//                             placeholder="••••••••"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-white/90 mb-2 text-sm font-medium">Confirm Password</label>
//                         <input
//                             type="password"
//                             value={formData.confirmPassword}
//                             onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
//                             required
//                             className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
//                             placeholder="••••••••"
//                         />
//                     </div>

//                     <button
//                         type="submit"
//                         disabled={loading}
//                         className="w-full bg-linear-to-r cursor-pointer from-purple-500 to-pink-500 text-white py-3.5 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
//                     >
//                         {loading ? (
//                             <span className="flex items-center justify-center gap-2">
//                                 <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
//                                 Creating Account...
//                             </span>
//                         ) : 'Register'}
//                     </button>
//                 </form>

//                 <p className="text-gray-400  text-center mt-6 text-sm">
//                     Already have an account?{' '}
//                     <button onClick={onLoginClick} className="text-purple-400 cursor-pointer hover:text-purple-300 font-semibold transition-colors">
//                         Login
//                     </button>
//                 </p>
//             </div>
//         </div>
//     );
// };

// export default Register






import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const Register = ({ onLoginClick }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div
          className="absolute w-96 h-96 bg-pink-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <div className="relative bg-white/5 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400">Join the community</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white/90 mb-2 text-sm font-medium">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
              placeholder="jay"
            />
          </div>

          <div>
            <label className="block text-white/90 mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
              placeholder="jay@me.com"
            />
          </div>

          {/* Password with toggle */}
          <div className="relative">
            <label className="block text-white/90 mb-2 text-sm font-medium">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 pt-7 cursor-pointer text-gray-300 hover:text-gray-300 focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r cursor-pointer from-purple-500 to-pink-500 text-white py-3.5 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Creating Account...
              </span>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6 text-sm">
          Already have an account?{' '}
          <button
            onClick={onLoginClick}
            className="text-purple-400 cursor-pointer hover:text-purple-300 font-semibold transition-colors"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
