<script>
import { ref, onBeforeMount, onUnmounted } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import "./style/login.scss";
import LoginPage from "./loginPage.vue";
// import SignupPage from "./signupPage.vue";
// import ForgetPassword from "./forgetPassword.vue";
import { useGlobalStore } from "@/store/global";

import { useRoute } from "vue-router";

export default {
  name: "loginIndex",
  setup() {
    const mode = ref("login");
    const { query } = useRoute();

    const globalStore = useGlobalStore();
    const { goto } = globalStore;

    const handleModeChange = (val) => {
      // if (val == "signup") {
      //   mode.value = "signup";
      //   goto("router", "/login/signup");
      // }
      // if (val == "forget") {
      //   mode.value = "forget";
      //   goto("router", "/login/forget");
      // }
      // if (val == "login") {
      //   mode.value = "login";
      //   goto("router", "/login");
      // }
    };

    const breakData = ref({});

    onBeforeMount(() => {
      document.body.classList.add("c-login");
      // if (query.signup == "1") {
      //   mode.value = "signup";
      // }

      // if (query.forget == "1") {
      //   mode.value = "forget";
      //   breakData.value = {
      //     otp: query.otp,
      //     mobile: query.mobile,
      //     forget: "1",
      //   };
      // }
    });
    onUnmounted((to, from, next) => {
      document.body.classList.remove("c-login");
    });

    const triggerBackDoor = ref("0");
    const handleBlack = () => {
      // triggerBackDoor.value = "1";
      // setTimeout(() => (triggerBackDoor.value = "2"), 1000);
    };

    return {
      mode,
      goto,
      handleModeChange,
      handleBlack,
      triggerBackDoor,
      breakData,
    };
  },
  components: {
    // LoginPage,
    // SignupPage,
    // ForgetPassword
  },
};
</script>

<template>
  <section class="c-main">
    <div class="main-header">
      <div class="main-navbar">
        <ul class="navbar-nav">
          <li class="nav-item">
            <a @click="goto('router', '/setting/profile')" class="nav-link"
              ><i class="icon icon-clear"></i
            ></a>
          </li>
        </ul>
      </div>
    </div>
    <div class="logo-container">
      <div class="logo">
        <img src="@/assets/images/logo.png" @click="handleBlack" />
      </div>
    </div>

    <router-view />

    <!-- <LoginPage
      v-if="mode === 'login'"
      :triggerBackDoor="triggerBackDoor"
      @mode="handleModeChange"
    /> -->

    <!-- <SignupPage v-if="mode === 'signup'" @mode="handleModeChange" />

    <ForgetPassword
      :breakData="breakData"
      v-if="mode === 'forget'"
      @mode="handleModeChange"
    /> -->
  </section>
</template>

<style lang="scss" scoped></style>
