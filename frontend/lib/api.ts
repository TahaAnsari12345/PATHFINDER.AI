const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
    async signup(email: string, password: string) {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async login(email: string, password: string) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getTopics() {
        const res = await fetch(`${API_URL}/topics/`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getTopic(id: string) {
        const res = await fetch(`${API_URL}/topics/${id}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getRandomTopic() {
        const res = await fetch(`${API_URL}/topics/random`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async updateProgress(userId: string, topicId: string, status: string) {
        const res = await fetch(`${API_URL}/progress/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, topic_id: topicId, status }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getUserProgress(userId: string) {
        const res = await fetch(`${API_URL}/progress/${userId}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getRecommendations(userId: string) {
        const res = await fetch(`${API_URL}/progress/${userId}/recommendations`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async explain(topic: string, concept: string, difficulty: string) {
        const res = await fetch(`${API_URL}/ai/explain`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, concept, difficulty }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getChatHistory(topicId: number | null, userId: string, projectId?: number) {
        let url = `${API_URL}/ai_tutor/history/${topicId || 0}/${userId}`;
        if (projectId) {
            url += `?project_id=${projectId}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async chatTutor(history: any[], message: string, socraticMode: boolean, topicId: number | null, userId: string, projectId?: number) {
        const res = await fetch(`${API_URL}/ai_tutor/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                history,
                message,
                socratic_mode: socraticMode,
                user_id: parseInt(userId),
                topic_id: topicId,
                project_id: projectId
            }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async editMessage(messageId: number, newContent: string, userId: string, topicId: number | null, socraticMode: boolean, projectId?: number) {
        const res = await fetch(`${API_URL}/ai_tutor/edit_message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message_id: messageId,
                new_content: newContent,
                user_id: parseInt(userId),
                topic_id: topicId,
                project_id: projectId,
                socratic_mode: socraticMode
            }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async streamChatTutor(history: any[], message: string, socraticMode: boolean, topicId: number | null, userId: string, projectId?: number) {
        const res = await fetch(`${API_URL}/ai_tutor/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                history,
                message,
                socratic_mode: socraticMode,
                topic_id: topicId,
                user_id: parseInt(userId),
                project_id: projectId
            }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res;
    },

    async streamEditMessage(messageId: number, newContent: string, userId: string, topicId: number | null, socraticMode: boolean, projectId?: number) {
        const res = await fetch(`${API_URL}/ai_tutor/edit_message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message_id: messageId,
                new_content: newContent,
                user_id: parseInt(userId),
                topic_id: topicId,
                project_id: projectId,
                socratic_mode: socraticMode
            }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res;
    },

    async getDiagram(concept: string) {
        const res = await fetch(`${API_URL}/ai/diagram`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ concept }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async searchTopics(query: string) {
        const res = await fetch(`${API_URL}/topics/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async generateProject(userId: string, topicIds: number[], customPrompt?: string, useHistory?: boolean) {
        const res = await fetch(`${API_URL}/projects/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: parseInt(userId), topic_ids: topicIds, custom_prompt: customPrompt, use_history: useHistory }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async generateTopic(userId: string, prompt: string, useHistory: boolean) {
        const res = await fetch(`${API_URL}/topics/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: parseInt(userId), prompt, use_history: useHistory }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async createProject(userId: string, title: string, description: string, steps: any[]) {
        const res = await fetch(`${API_URL}/projects/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: parseInt(userId), title, description, steps }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getUserProjects(userId: string) {
        const res = await fetch(`${API_URL}/projects/${userId}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getProjectDetail(projectId: string) {
        const res = await fetch(`${API_URL}/projects/detail/${projectId}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async verifyStep(projectId: string, code: string, instruction: string) {
        const res = await fetch(`${API_URL}/projects/${projectId}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, step_instruction: instruction }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getProjectHint(projectId: string, code: string, instruction: string) {
        const res = await fetch(`${API_URL}/projects/${projectId}/hint`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, step_instruction: instruction }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getGamificationData(userId: string) {
        const res = await fetch(`${API_URL}/progress/${userId}/gamification`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async deleteTopic(topicId: number) {
        const res = await fetch(`${API_URL}/topics/${topicId}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async deleteProject(projectId: number) {
        const res = await fetch(`${API_URL}/projects/${projectId}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async search(query: string) {
        const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async checkUserMemory(userId: string): Promise<{ hasMemory: boolean }> {
        const res = await fetch(`${API_URL}/projects/check-memory/${userId}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
};
