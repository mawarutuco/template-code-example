import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from "vue-router";

export const useGlobalStore = defineStore('global', () => {
    const globalLoading = ref(false);

    const router = useRouter();
    const goto = (mode, val) => {
        if (mode === "href") {
            const url = val || "https://myfree.tako.life/privacy";
            // window.location.href = url;
            window.open(url, '_blank');
        }
        if (mode === "router") {
            router.push({ path: val });
        }
        if (mode === "back") {
            router.back();
        }

    };

    return { globalLoading, goto }
})
