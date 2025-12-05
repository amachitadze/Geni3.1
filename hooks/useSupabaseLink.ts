import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../utils/supabaseClient';

interface UseSupabaseLinkProps {
    setIsViewingTree: (val: boolean) => void;
}

export const useSupabaseLink = ({ setIsViewingTree }: UseSupabaseLinkProps) => {
    const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
    const [encryptedData, setEncryptedData] = useState<string | null>(null);
    const [decryptionError, setDecryptionError] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const sbId = urlParams.get('sbId'); // Supabase ID (filename)
        const cfg = urlParams.get('cfg'); // Config string (base64 encoded)

        if (sbId && cfg) {
            setIsViewingTree(true);
            setIsPasswordPromptOpen(true);
            
            const fetchFile = async () => {
                try {
                    const configStr = atob(cfg);
                    const config = JSON.parse(configStr);
                    
                    if (!config.u || !config.k) {
                        throw new Error("Invalid configuration");
                    }

                    const supabase = getSupabaseClient(config.u, config.k);

                    const { data, error } = await supabase
                        .storage
                        .from('shares')
                        .download(sbId);

                    if (error) throw error;
                    if (!data) throw new Error("Empty data received");

                    const text = await data.text();
                    setEncryptedData(text);

                    // --- ONE-TIME VIEW POLICY ---
                    try {
                        await supabase
                            .storage
                            .from('shares')
                            .remove([sbId]);
                        console.log("File removed from server (One-time view policy)");
                    } catch (deleteError) {
                        console.warn("Failed to delete shared file:", deleteError);
                    }

                } catch (error: any) {
                     console.error("Failed to fetch data:", error);
                     setDecryptionError("მონაცემების ჩამოტვირთვა ვერ მოხერხდა. ბმული დაზიანებულია ან ფაილი უკვე წაშლილია (ერთჯერადი ბმული).");
                     setIsPasswordPromptOpen(true);
                }
            };
            fetchFile();
        }
    }, [setIsViewingTree]);

    return {
        isPasswordPromptOpen,
        setIsPasswordPromptOpen,
        encryptedData,
        decryptionError,
        setDecryptionError
    };
};