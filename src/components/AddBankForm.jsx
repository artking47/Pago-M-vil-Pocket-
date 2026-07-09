import React, { useState } from 'react';
import { BANK_LIST, getBankColor, getBankLogo, getBankInitials } from '../utils/storage';
import { PlusIcon, XIcon, AlertCircleIcon } from './Icons';

function AddBankForm({ onAdd, onClose }) {
    const [formData, setFormData] = useState({ banco: BANK_LIST[0], cedula: '', telefono: '' });
    const [errors, setErrors] = useState({});
    const [logoError, setLogoError] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        const cedulaRegex = /^[VEJPGvejpg]-?\d{6,9}$/;
        if (!formData.cedula) newErrors.cedula = 'La cédula es requerida';
        else if (!cedulaRegex.test(formData.cedula.replace(/\s/g, ''))) newErrors.cedula = 'Formato: V-12345678';

        const telefonoRegex = /^0?(412|414|424|416|426)\d{7}$/;
        const cleanPhone = formData.telefono.replace(/[-\s]/g, '');
        if (!formData.telefono) newErrors.telefono = 'El teléfono es requerido';
        else if (!telefonoRegex.test(cleanPhone)) newErrors.telefono = 'Formato: 0414-1234567';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) { onAdd(formData); setFormData({ banco: BANK_LIST[0], cedula: '', telefono: '' }); setErrors({}); onClose(); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setLogoError(false);
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const selectedBankColor = getBankColor(formData.banco);
    const selectedBankLogo = getBankLogo(formData.banco);
    const selectedBankInitials = getBankInitials(formData.banco);

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in-up"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            <div className="card-glass max-w-md w-full p-0 overflow-hidden animate-slide-down">
                {/* Header */}
                <div className="p-5 text-white" style={{ background: selectedBankColor }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <PlusIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Nueva Cuenta</h2>
                                <p className="text-white/70 text-sm">Agrega tus datos de Pago Móvil</p>
                            </div>
                        </div>
                        <button onClick={onClose}
                            className="w-9 h-9 rounded-lg hover:bg-white/15 transition-colors flex items-center justify-center"
                            aria-label="Cerrar">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Bank preview */}
                    <div className="flex items-center gap-3 p-3 rounded-xl glass-surface">
                        <div className="w-11 h-11 logo-glass rounded-xl">
                            {selectedBankLogo && !logoError ? (
                                <img src={selectedBankLogo} alt={formData.banco} className="w-full h-full object-contain p-1.5"
                                    loading="lazy" decoding="async" onError={() => setLogoError(true)} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center rounded-xl" style={{ background: selectedBankColor }}>
                                    <span className="text-white font-bold text-sm">{selectedBankInitials}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-outline">Banco seleccionado</p>
                            <p className="font-bold text-sm text-on-surface">{formData.banco}</p>
                        </div>
                    </div>

                    {/* Banco */}
                    <div>
                        <label htmlFor="form-banco" className="block text-sm font-semibold mb-1.5 text-on-surface-variant">Banco</label>
                        <select id="form-banco" name="banco" value={formData.banco} onChange={handleChange} className="input-glass">
                            {BANK_LIST.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                        </select>
                        <p className="text-xs mt-1 text-outline">{BANK_LIST.length} bancos disponibles</p>
                    </div>

                    {/* Cédula */}
                    <div>
                        <label htmlFor="form-cedula" className="block text-sm font-semibold mb-1.5 text-on-surface-variant">Cédula</label>
                        <input id="form-cedula" type="text" name="cedula" value={formData.cedula} onChange={handleChange}
                            placeholder="V-12345678" className="input-glass"
                            style={errors.cedula ? { borderColor: '#ffb4ab' } : {}} />
                        {errors.cedula && (
                            <p className="text-error text-sm mt-1 flex items-center gap-1">
                                <AlertCircleIcon className="w-3.5 h-3.5" />{errors.cedula}
                            </p>
                        )}
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label htmlFor="form-telefono" className="block text-sm font-semibold mb-1.5 text-on-surface-variant">Teléfono</label>
                        <input id="form-telefono" type="text" name="telefono" value={formData.telefono} onChange={handleChange}
                            placeholder="0414-1234567" className="input-glass"
                            style={errors.telefono ? { borderColor: '#ffb4ab' } : {}} />
                        {errors.telefono && (
                            <p className="text-error text-sm mt-1 flex items-center gap-1">
                                <AlertCircleIcon className="w-3.5 h-3.5" />{errors.telefono}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-glass btn-glass-secondary">Cancelar</button>
                        <button type="submit" className="btn-glass btn-glass-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddBankForm;
