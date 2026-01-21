
export const sendApprovalEmail = async (to: string, name: string, tempPass: string) => {
    try {
        const response = await fetch('http://localhost:3001/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to, name, tempPass })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Backend Error:", data);
            return { success: false, error: data.error || 'Failed to send email', details: data.details, hint: data.hint };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error("Network Error Sending Email:", error);
        return { success: false, error: "Network error", details: error.message };
    }
};
