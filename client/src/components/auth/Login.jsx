import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const Login = ({ onRegisterClick }) => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const [showPassword, setShowPassword] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(formData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-md shadow-sm">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-tx mb-1">Welcome Back</h2>
                    <p className="text-tx-secondary text-sm">Sign in to continue</p>
                </div>

                {error && (
                    <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-tx-secondary mb-2 text-sm font-medium">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-tx placeholder-tx-muted focus:outline-none focus:border-border-hover transition-all"
                            placeholder="jay@me.com"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-tx-secondary mb-2 text-sm font-medium">Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-tx placeholder-tx-muted focus:outline-none focus:border-border-hover transition-all pr-10"
                            placeholder="••••••••"
                        />

                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 pt-7 cursor-pointer text-tx-muted hover:text-tx-secondary focus:outline-none"
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    </div>


                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent cursor-pointer text-bg py-3 rounded-lg font-medium hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-bg"></div>
                                Signing in...
                            </span>
                        ) : 'Sign In'}
                    </button>
                </form>

                <p className="text-tx-muted text-center mt-6 text-sm">
                    Don't have an account?{' '}
                    <button onClick={onRegisterClick} className="text-tx cursor-pointer hover:underline font-medium transition-colors">
                        Register
                    </button>
                </p>
            </div>
        </div>
    );
};
export default Login