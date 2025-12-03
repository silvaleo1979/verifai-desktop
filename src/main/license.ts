
import { machineId } from 'node-machine-id';
import axios, { AxiosInstance } from 'axios';
import Store from 'electron-store';
import { app, dialog } from 'electron';
import os from 'os';

interface LicenseData {
  license_id: string;
  serial_key: string;
  product_name: string;
  valid_until: string;
  company: string;
  activation: string;
  last_validated_at: string;
}

interface ActivateResponse {
  license_id: string;
  expires_at: string;
  company_name: string;
  license_data: {
    product: string;
    serial_key: string;
  }
  activation_id: string;
  message: string;
}

interface ValidateResponse {
  valid: boolean;
  license_id: string;
  valid_until: string;
  last_validated_at: string;
  message: string;
}

interface DeactivateResponse {
  message: string;
}

export class LicenseManager {
  private store: Store;
  private apiUrl: string;
  private deviceId: string | null = null;
  private machineName: string;
  private axiosInstance: AxiosInstance;
  private validationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.store = new Store({ name: 'license' });
    this.apiUrl = process.env.VERIFAI_API_URL || 'https://api.t2verification.com.br';
    this.machineName = os.hostname();
    
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  async init() {
    try {
      this.deviceId = await machineId();
    } catch (error) {
      console.error('Failed to get machine ID:', error);
      // Fallback or fatal error?
    }
  }

  async activate(serialKey: string): Promise<{ success: boolean; message: string; data?: LicenseData }> {
    if (!this.deviceId) await this.init();

    try {
      const response = await this.axiosInstance.post<ActivateResponse>('/api/v1/licenses/activate/', {
        serial_key: serialKey,
        machine_id: this.deviceId,
        machine_name: this.machineName,
      });
      if (response.data && response.data.license_id) {
        const license_data = {
          license_id: response.data.license_id,
          serial_key: response.data.license_data.serial_key,
          product_name: response.data.license_data.product,
          valid_until: response.data.expires_at,
          company: response.data.company_name,
          activation: response.data.activation_id,
          last_validated_at: new Date().toISOString(),
        }
        // Store license data locally
        this.store.set('license', license_data);
        
        // Start periodic validation
        this.startPeriodicValidation();
        
        return {
          success: true,
          message: response.data.message || 'Licença ativada com sucesso',
          data: license_data
        };
      } else {
        throw new Error('Resposta de ativação inválida');
      }
    } catch (error: any) {
      console.error('Activation error:', error);
      const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Erro ao ativar licença';
      return {
        success: false,
        message,
      };
    }
  }

  async validate(): Promise<boolean> {
    if (!this.deviceId) await this.init();

    const license = this.store.get('license') as LicenseData | undefined;
    if (!license) return false;

    try {
      const response = await this.axiosInstance.post<ValidateResponse>('/api/v1/licenses/validate/', {
        serial_key: license.serial_key,
        machine_id: this.deviceId,
      });

      if (response.data.valid) {
        // Update validation timestamp
        const updatedLicense = {
          ...license,
          valid_until: response.data.valid_until,
          last_validated_at: response.data.last_validated_at,
        };
        this.store.set('license', updatedLicense);
        return true;
      } else {
        // License invalid/expired - clear stored data
        this.store.delete('license');
        this.stopPeriodicValidation();
        return false;
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      
      // Network error - check offline grace period (7 days)
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || !error.response) {
        return this.checkOfflineGracePeriod(license);
      }
      
      // Server returned an error (403, 404, etc.) - license is invalid
      if (error.response?.status === 403 || error.response?.status === 404) {
        this.store.delete('license');
        this.stopPeriodicValidation();
        return false;
      }
      
      // Other errors - check grace period as fallback
      return this.checkOfflineGracePeriod(license);
    }
  }

  private checkOfflineGracePeriod(license: LicenseData): boolean {
    const gracePeriodDays = 7;
    const lastValidated = new Date(license.last_validated_at);
    const now = new Date();
    const daysSinceValidation = (now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceValidation > gracePeriodDays) {
      return false;
    }
    
    // Check if license itself is expired
    const validUntil = new Date(license.valid_until);
    if (now > validUntil) {
      this.store.delete('license');
      return false;
    }
    
    return true;
  }

  isAuthenticated(): boolean {
    const license = this.store.get('license');
    return !!license;
  }

  getLicenseInfo(): LicenseData | null {
    return this.store.get('license') as LicenseData | null;
  }

  async deactivate(): Promise<{ success: boolean; message: string }> {
    if (!this.deviceId) await this.init();

    const license = this.store.get('license') as LicenseData | undefined;
    if (!license) {
      return { success: false, message: 'Nenhuma licença ativa encontrada' };
    }

    try {
      await this.axiosInstance.post<DeactivateResponse>('/api/v1/licenses/deactivate/', {
        serial_key: license.serial_key,
        machine_id: this.deviceId,
      });

      this.store.delete('license');
      this.stopPeriodicValidation();
      
      return { success: true, message: 'Licença desativada com sucesso' };
    } catch (error: any) {
      console.error('Deactivation error:', error);
      const message = error.response?.data?.message || error.message || 'Erro ao desativar licença';
      return { success: false, message };
    }
  }

  startPeriodicValidation() {
    // Clear any existing interval
    this.stopPeriodicValidation();
    
    // Validate every 24 hours
    this.validationInterval = setInterval(async () => {
      const isValid = await this.validate();
      if (!isValid) {
        // Emit event to notify main window
        if (app) {
          app.emit('license-invalid');
        }
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  stopPeriodicValidation() {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
  }

  async checkLicenseBlocking() {
    // If we are in trial mode, check if trial expired first
    if (process.env.VERIFAI_TRIAL === 'true') {
      // Trial logic is handled in main.ts
      // After trial expires, user must activate a license
      return;
    }

    const isValid = await this.validate();
    if (!isValid) {
      const license = this.getLicenseInfo();
      
      const response = await dialog.showMessageBox({
        type: 'error',
        title: 'Licença Inválida ou Expirada',
        message: license 
          ? 'Sua licença expirou ou não é mais válida para este dispositivo.'
          : 'Nenhuma licença ativa encontrada.',
        detail: 'Por favor, ative uma licença válida para continuar usando o VerifAI.',
        buttons: ['Ativar Licença', 'Sair'],
        defaultId: 0,
        cancelId: 1,
      });

      if (response.response === 0) {
        // Return false to let main.ts handle showing activation window
        return false;
      } else {
        app.quit();
        process.exit(0);
      }
    }
    
    // Start periodic validation if valid
    this.startPeriodicValidation();
    return true;
  }

  cleanup() {
    this.stopPeriodicValidation();
  }
}

export default new LicenseManager();
