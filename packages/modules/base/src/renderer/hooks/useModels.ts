import { useState, useEffect, useCallback } from 'react';
import { hostApi as __hostApi } from '../host-services';

export interface DownloadProgress {
    total: number;
    received: number;
    percent: number;
    filename: string;
}

export interface ModelStatus {
    modelExists: boolean;
    voicesExists: boolean;
    modelsDir: string;
}

export const useModels = () => {
    const [status, setStatus] = useState<ModelStatus | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const refreshStatus = useCallback(async () => {
        const currentStatus = await __hostApi.module.invoke('@citadel-app/base', 'models.checkStatus');
        setStatus(currentStatus);
    }, []);

    useEffect(() => {
        refreshStatus();

        const removeListener = __hostApi.on('models:download-progress', (progress: DownloadProgress) => {
            setDownloadProgress(progress);
            if (progress.percent === 100) {
                setTimeout(refreshStatus, 1000);
            }
        });

        return () => {
            removeListener();
        };
    }, [refreshStatus]);

    const downloadModel = useCallback(async () => {
        setIsDownloading(true);
        try {
            const result = await __hostApi.module.invoke('@citadel-app/base', 'models.download');
            if (result.success) {
                await refreshStatus();
            }
            return result;
        } finally {
            setIsDownloading(false);
            setDownloadProgress(null);
        }
    }, [refreshStatus]);

    return {
        status,
        downloadProgress,
        isDownloading,
        refreshStatus,
        downloadModel
    };
};
