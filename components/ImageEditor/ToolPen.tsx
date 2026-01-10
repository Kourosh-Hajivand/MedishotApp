import colors from "@/theme/colors.shared";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { ImageEditorToolProps } from "./types";

// رنگ‌های iOS طبق دیزاین Figma
const PEN_COLORS = [
    { id: "red", color: "#FF3B30" },
    { id: "blue", color: "#007AFF" },
    { id: "green", color: "#34C759" },
    { id: "mint", color: "#00C7BE" },
    { id: "pink", color: "#FF2D55" },
    { id: "yellow", color: "#FFCC00" },
    { id: "orange", color: "#FF9500" },
];

// سایزهای استروک
const STROKE_SIZES = [
    { id: "thin", width: 2, index: 0 },
    { id: "light", width: 4, index: 1 },
    { id: "medium", width: 6, index: 2 },
    { id: "bold", width: 10, index: 3 },
];

// آیکون خط‌خطی سایز ۱ - کمترین
const ScribbleIcon1: React.FC = () => (
    <Svg width={16} height={15} viewBox="0 0 16 15" fill="none">
        <Path d="M15.5933 13.1977C14.2526 14.1127 12.7084 15.4494 13.749 11.5659C14.7895 7.68248 12.94 9.14475 11.144 10.2057C8.55961 11.7324 5.82683 13.3255 9.19928 7.48424C13.4148 0.182658 11.4102 -2.68587 3.96096 4.76341C-1.99846 10.7228 0.84304 10.8747 3.00872 10.2057" stroke="black" strokeWidth={0.796449} strokeLinecap="round" />
    </Svg>
);

// آیکون خط‌خطی سایز ۲
const ScribbleIcon2: React.FC = () => (
    <Svg width={17} height={16} viewBox="0 0 17 16" fill="none">
        <Path
            d="M16.404 14.1988C16.5101 14.1214 16.584 14.0063 16.6078 13.8764C16.6315 13.7466 16.6035 13.613 16.5295 13.5046C16.4555 13.3962 16.3413 13.3213 16.2117 13.2961C16.0821 13.2709 15.948 13.2978 15.8373 13.3684C15.8373 13.3684 15.8373 13.3684 15.8373 13.3684C15.5215 13.5705 15.2207 13.7766 14.9287 13.9493C14.7838 14.0348 14.6386 14.1129 14.5136 14.1623C14.397 14.2212 14.2634 14.1925 14.4072 14.2144C14.5038 14.2445 14.5467 14.3351 14.5365 14.3069C14.532 14.2868 14.5223 14.2196 14.5227 14.1376C14.5224 13.9759 14.5478 13.7736 14.5836 13.5743C14.6576 13.1642 14.7713 12.7415 14.8966 12.3181C15.0309 11.8576 15.1558 11.3911 15.2276 10.8705C15.2597 10.6072 15.2892 10.3415 15.2383 9.98906C15.21 9.82038 15.1606 9.60106 14.9946 9.36957C14.8345 9.13021 14.4915 8.94404 14.2356 8.91813C13.2695 8.88681 12.9549 9.22703 12.4892 9.43481C12.0599 9.66804 11.6653 9.90856 11.2779 10.1256C10.6867 10.4573 10.1004 10.7899 9.52978 11.0582C9.24849 11.1897 8.95782 11.3083 8.74347 11.3547C8.64758 11.3825 8.55052 11.3556 8.68174 11.3784C8.74549 11.3902 8.88668 11.4767 8.94602 11.5736C9.00853 11.6691 9.00815 11.7178 9.0111 11.719C9.00404 11.6921 9.07412 11.3653 9.18013 11.1059C9.28777 10.8256 9.41649 10.5484 9.56286 10.2546C9.8497 9.6823 10.1781 9.10616 10.5218 8.52925C11.2224 7.34692 11.8657 6.13269 12.3562 4.79983C12.5971 4.12321 12.813 3.43095 12.8785 2.59868C12.9006 2.18802 12.9097 1.72638 12.6824 1.16667C12.4916 0.59593 11.7279 0.0276904 11.1348 -0.000260711C7.24507 0.481241 5.87034 2.79625 3.78018 4.60001C3.77332 4.60687 3.76645 4.61374 3.75957 4.62062C2.90442 5.47973 2.09238 6.35042 1.33295 7.35719C0.958509 7.86314 0.599999 8.37904 0.30131 9.03576C0.162549 9.36494 0.00785339 9.72375 -1.54376e-05 10.2752C-0.000121474 10.5435 0.0666283 10.9048 0.282236 11.212C0.496224 11.5237 0.807776 11.708 1.05852 11.798C2.29397 12.1302 2.98705 11.7876 3.77113 11.5526C3.96484 11.4818 4.12843 11.3421 4.22378 11.1574C4.31916 10.9727 4.33884 10.7592 4.27806 10.5624C4.21729 10.3657 4.08061 10.2005 3.89769 10.1017C3.71474 10.003 3.50087 9.97988 3.30099 10.0307C3.30099 10.0307 3.30099 10.0307 3.30099 10.0307C2.69872 10.1923 1.89075 10.2518 1.70883 10.1324C1.68778 10.1174 1.74309 10.1302 1.79347 10.196C1.84409 10.2609 1.84734 10.3177 1.8517 10.2951C1.85643 10.2521 1.92142 10.0425 2.02518 9.85149C2.23806 9.44497 2.56155 9.0055 2.90602 8.57986C3.60932 7.71742 4.39729 6.90013 5.21704 6.07809C5.22363 6.0715 5.23022 6.06492 5.23679 6.05835C6.97666 4.33043 9.397 2.13632 10.8878 1.98943C10.9576 2.02157 10.8021 1.90345 10.8548 1.95401C10.8875 2.00983 10.9244 2.23565 10.9089 2.47698C10.8822 2.98244 10.7279 3.5774 10.5315 4.15668C10.1337 5.31746 9.5628 6.47665 8.93149 7.6111C8.29291 8.9205 7.4685 9.78564 7.31272 11.8847C7.33237 12.0552 7.37414 12.2725 7.53021 12.5098C7.68112 12.7487 7.97156 12.9371 8.19814 12.9958C8.66158 13.1118 8.91041 13.0256 9.14277 12.9756C9.59488 12.8519 9.92042 12.6875 10.2511 12.5204C10.8997 12.183 11.4843 11.816 12.0648 11.4577C12.4704 11.2067 12.8538 10.95 13.2244 10.7268C13.4088 10.616 13.5917 10.5128 13.7572 10.4366C13.913 10.3572 14.0961 10.3277 14.0442 10.3277C14.0175 10.3293 13.8934 10.2627 13.8676 10.2102C13.8376 10.1604 13.8601 10.1777 13.8697 10.2277C13.8949 10.334 13.8971 10.5274 13.8807 10.7214C13.8472 11.1191 13.7583 11.555 13.656 11.9857C13.5466 12.4435 13.4474 12.9019 13.3853 13.3974C13.3565 13.6422 13.3333 13.8949 13.3502 14.1864C13.3614 14.3403 13.3764 14.4895 13.4474 14.6895C13.5091 14.8736 13.6938 15.1687 14.0076 15.2767C14.5037 15.4204 14.7461 15.2529 14.9589 15.1717C15.1685 15.0724 15.3388 14.9633 15.5024 14.8539C15.8266 14.6346 16.117 14.4078 16.404 14.1988Z"
            fill="black"
        />
    </Svg>
);

// آیکون خط‌خطی سایز ۳
const ScribbleIcon3: React.FC = () => (
    <Svg width={17} height={16} viewBox="0 0 17 16" fill="none">
        <Path
            d="M16.7062 14.7114C16.8084 14.6319 16.8803 14.5175 16.9031 14.3888C16.9259 14.2601 16.8982 14.1283 16.8253 14.0216C16.7525 13.9149 16.64 13.8411 16.5118 13.8154C16.3836 13.7897 16.2509 13.815 16.1396 13.8811C16.1396 13.8811 16.1396 13.8811 16.1396 13.8811C15.8173 14.0737 15.5094 14.2708 15.2127 14.4333C15.0657 14.5136 14.9186 14.5861 14.7954 14.6287C14.6816 14.6824 14.5501 14.6377 14.733 14.6644C14.8549 14.6997 14.9155 14.8126 14.9113 14.7941C14.9141 14.785 14.9078 14.7235 14.9118 14.6467C14.9183 14.4945 14.9495 14.2971 14.9911 14.1025C15.0767 13.7016 15.2018 13.2853 15.3381 12.8681C15.4855 12.4066 15.6238 11.939 15.7094 11.4031C15.7479 11.1309 15.7863 10.8559 15.7359 10.4677C15.7069 10.2817 15.6559 10.0326 15.4628 9.75854C15.277 9.47503 14.8654 9.24893 14.5668 9.21729C13.9705 9.15275 13.6847 9.30257 13.3997 9.39648C13.124 9.50272 12.8916 9.61735 12.6686 9.7315C12.2259 9.9601 11.8252 10.1921 11.4378 10.3974C10.8398 10.7158 10.2482 11.0343 9.68918 11.2813C9.41591 11.402 9.13022 11.5076 8.96369 11.5344C8.89545 11.5558 8.82912 11.5033 9.08501 11.5532C9.20965 11.5789 9.44196 11.722 9.54639 11.8892C9.65572 12.0542 9.6651 12.159 9.67374 12.1965C9.67706 12.303 9.73316 11.9795 9.84015 11.7476C9.94638 11.4882 10.076 11.2223 10.2236 10.939C10.5133 10.3865 10.8468 9.82242 11.1957 9.25652C11.9216 8.06822 12.5906 6.84506 13.1111 5.47208C13.3666 4.77249 13.6013 4.05702 13.6797 3.1422C13.705 2.68872 13.7274 2.16717 13.4517 1.47816C13.227 0.77405 12.2284 0.0282829 11.5006 0.000111818C8.87538 0.0331184 8.07333 1.14501 6.82506 1.94516C5.69521 2.80949 4.66878 3.75855 3.69708 4.7269C3.69014 4.73384 3.68319 4.74079 3.67625 4.74774C2.81217 5.61657 2.00733 6.51746 1.26793 7.58443C0.903403 8.12157 0.558229 8.67236 0.272803 9.39194C0.142046 9.75402 -0.0110329 10.1494 0.0007447 10.7846C0.0111157 11.0933 0.100473 11.5177 0.364062 11.8728C0.625871 12.2336 0.994201 12.4338 1.27813 12.5223C2.6605 12.823 3.30391 12.3769 4.07338 12.0653C4.24923 11.9765 4.40095 11.8365 4.4891 11.6566C4.57729 11.4768 4.59542 11.274 4.53801 11.0882C4.4806 10.9023 4.35129 10.7452 4.17705 10.6464C4.00276 10.5475 3.79853 10.5175 3.60324 10.5434C3.60324 10.5434 3.60324 10.5434 3.60324 10.5434C3.27236 10.5813 2.94247 10.5991 2.64804 10.582C2.36543 10.5714 2.06391 10.4862 2.09372 10.4334C2.10585 10.417 2.21794 10.4457 2.31613 10.5605C2.41474 10.6734 2.44059 10.7933 2.45543 10.811C2.4798 10.8519 2.54642 10.6788 2.65818 10.5207C2.88432 10.177 3.22114 9.77247 3.57553 9.37801C4.29886 8.57577 5.09404 7.78867 5.90486 6.97635C5.91137 6.96985 5.91789 6.96334 5.92439 6.95685C6.83249 6.05086 7.77794 5.16969 8.73507 4.41621C9.22015 4.03566 9.70621 3.68991 10.1787 3.41979C10.4162 3.28446 10.6409 3.17456 10.8389 3.10163C11.0231 3.02751 11.195 3.0188 11.1265 3.01444C11.0951 3.00945 10.979 2.9802 10.87 2.89449C10.7597 2.81085 10.7001 2.70199 10.69 2.66791C10.6743 2.59444 10.7245 2.76035 10.7122 2.95885C10.6983 3.38176 10.5628 3.95351 10.3811 4.50982C10.0134 5.63049 9.46801 6.78074 8.86208 7.90922C8.52536 8.53272 8.20238 9.16076 7.90569 9.82879C7.75332 10.174 7.61626 10.5068 7.48604 10.8993C7.37117 11.3075 7.20575 11.6435 7.25458 12.4326C7.27991 12.6394 7.33144 12.9128 7.53433 13.2196C7.73033 13.5288 8.11189 13.7738 8.39937 13.8464C8.98748 13.9895 9.26703 13.8777 9.52705 13.8213C10.027 13.6779 10.3575 13.5005 10.6962 13.3226C11.3564 12.964 11.9357 12.5829 12.5094 12.2113C12.915 11.9485 13.2924 11.6833 13.6496 11.4555C13.8269 11.3424 14.0012 11.2381 14.1502 11.1631C14.2872 11.0828 14.4544 11.0659 14.3175 11.0539C14.2481 11.0498 14.0553 10.9433 14.004 10.8466C13.9468 10.7542 13.9676 10.7417 13.9766 10.7744C14.0023 10.845 14.0133 11.0291 14.0033 11.2142C13.9837 11.5966 13.9083 12.0313 13.819 12.461C13.7207 12.9251 13.6327 13.3899 13.5822 13.8946C13.5593 14.1441 13.5419 14.4018 13.5656 14.7028C13.5805 14.8618 13.5989 15.0167 13.677 15.2277C13.7449 15.4214 13.9472 15.7389 14.2863 15.8521C14.8214 16.0007 15.066 15.8171 15.2816 15.7308C15.493 15.6246 15.6614 15.51 15.8229 15.3953C16.1424 15.1657 16.4257 14.93 16.7062 14.7114Z"
            fill="black"
        />
    </Svg>
);

// آیکون خط‌خطی سایز ۴ - بیشترین
const ScribbleIcon4: React.FC = () => (
    <Svg width={18} height={17} viewBox="0 0 18 17" fill="none">
        <Path
            d="M17.1193 15.4195C17.2163 15.3371 17.2856 15.2235 17.3071 15.0963C17.3286 14.9692 17.3013 14.8399 17.2299 14.7354C17.1586 14.6309 17.0482 14.5583 16.922 14.5321C16.7957 14.5057 16.6647 14.5289 16.5526 14.5891C16.5526 14.5891 16.5526 14.5891 16.5526 14.5891C16.2216 14.7688 15.904 14.9539 15.6012 15.1024C15.4512 15.1757 15.3016 15.2408 15.1808 15.274C15.0708 15.3208 14.9423 15.2543 15.178 15.2877C15.3341 15.3298 15.4185 15.473 15.4227 15.4676C15.4351 15.4735 15.4334 15.4197 15.4423 15.3498C15.4581 15.2104 15.497 15.0197 15.5465 14.8315C15.6479 14.443 15.7882 14.0353 15.9395 13.6265C16.1044 13.1638 16.261 12.6946 16.3654 12.138C16.4126 11.8539 16.4629 11.5662 16.4132 11.1296C16.3833 10.9203 16.3301 10.631 16.1002 10.2992C15.8798 9.95601 15.3754 9.67591 15.0191 9.63654C14.3078 9.55572 14.0005 9.72276 13.69 9.81544C13.392 9.92319 13.148 10.0362 12.9154 10.1474C12.4546 10.3697 12.0459 10.5903 11.6584 10.7795C11.0511 11.0801 10.4524 11.3794 9.90908 11.5977C9.64665 11.7038 9.36771 11.7919 9.26583 11.792C9.235 11.8048 9.21021 11.7177 9.63472 11.8043C9.8417 11.8486 10.1972 12.0684 10.3626 12.3306C10.5353 12.5897 10.5579 12.7704 10.5742 12.8569C10.5942 13.0275 10.5897 12.9722 10.6184 12.9132C10.6452 12.8418 10.688 12.7367 10.7371 12.6299C10.8414 12.399 10.9723 12.1483 11.1216 11.8793C11.4151 11.3535 11.7556 10.8057 12.1114 10.2547C12.8717 9.05833 13.5751 7.8231 14.1363 6.39586C14.4116 5.66522 14.6717 4.91835 14.7676 3.8919C14.7972 3.38051 14.8376 2.77792 14.4964 1.91407C14.2259 1.02959 12.9097 0.0437422 11.9997 0.0152738C10.2075 -0.0984795 9.54531 0.440302 8.75185 0.799768C8.01049 1.19879 7.39243 1.62664 6.79317 2.07748C5.62177 2.96598 4.5756 3.93023 3.58904 4.91317C3.58199 4.9202 3.57494 4.92725 3.5679 4.93431C2.69174 5.81629 1.89666 6.75803 1.18434 7.9064C0.83322 8.48571 0.506081 9.08369 0.238591 9.88829C0.118658 10.2948 -0.0322343 10.7397 0.00611258 11.4883C0.0306522 11.8514 0.150584 12.3612 0.47906 12.7812C0.80554 13.2082 1.25065 13.4299 1.57945 13.5166C3.16051 13.7745 3.73677 13.1885 4.48647 12.7733C4.64042 12.6636 4.77672 12.5215 4.85591 12.3479C4.93514 12.1743 4.95139 11.9854 4.89802 11.8126C4.84464 11.6398 4.72464 11.4929 4.56134 11.3943C4.398 11.2956 4.20536 11.2552 4.01633 11.2514C4.01633 11.2514 4.01633 11.2514 4.01633 11.2514C3.66859 11.2338 3.32887 11.197 3.0405 11.1273C2.76753 11.0675 2.47575 10.9178 2.61857 10.8552C2.67557 10.8369 2.86444 10.8871 3.02731 11.0681C3.1908 11.2459 3.24723 11.4512 3.27624 11.5234C3.32718 11.6776 3.39598 11.554 3.51857 11.4404C3.76264 11.1817 4.1175 10.8243 4.48529 10.4721C5.23571 9.75121 6.04063 9.00497 6.83938 8.2058C6.84579 8.19939 6.8522 8.19299 6.8586 8.1866C7.75184 7.29519 8.67755 6.42921 9.59314 5.6999C10.0561 5.33196 10.5166 5.00083 10.938 4.75383C11.1484 4.63028 11.3422 4.534 11.483 4.47821C11.6099 4.41752 11.7058 4.44065 11.4535 4.4153C11.3327 4.3984 11.0887 4.32959 10.8693 4.15847C10.6475 3.99072 10.5158 3.76825 10.4714 3.64801C10.3903 3.3997 10.4585 3.48458 10.4505 3.62516C10.4541 3.93645 10.344 4.47679 10.182 5.00206C9.85496 6.06846 9.34416 7.20664 8.77254 8.32704C8.44278 8.96542 8.12675 9.6098 7.83392 10.3046C7.68322 10.664 7.54742 11.012 7.41529 11.433C7.30175 11.8782 7.11741 12.2187 7.18028 13.1881C7.21331 13.4441 7.27804 13.7933 7.54424 14.1943C7.80122 14.5984 8.30602 14.9201 8.67583 15.0113C9.43256 15.1911 9.75366 15.0447 10.0511 14.9797C10.6157 14.8096 10.9529 14.6148 11.3025 14.4222C11.9784 14.0349 12.5506 13.6346 13.115 13.2452C13.5205 12.9663 13.8899 12.6897 14.2289 12.4556C14.3967 12.3395 14.5594 12.2337 14.6861 12.1601C14.7977 12.0786 14.9433 12.079 14.6914 12.0507C14.5643 12.0388 14.2787 11.8784 14.1927 11.7219C14.0988 11.5719 14.1174 11.5192 14.1255 11.5285C14.1519 11.5507 14.1749 11.7221 14.1735 11.8954C14.1727 12.257 14.1155 12.6902 14.0438 13.1186C13.9605 13.5912 13.8878 14.0645 13.853 14.5816C13.838 14.8374 13.8283 15.1019 13.8612 15.4157C13.8811 15.5817 13.904 15.7442 13.9918 15.9702C14.0681 16.177 14.2942 16.5248 14.6675 16.6448C15.2554 16.8001 15.5029 16.5948 15.7223 16.5014C15.9362 16.386 16.1021 16.2639 16.2606 16.1422C16.5739 15.8986 16.8475 15.6509 17.1193 15.4195Z"
            fill="black"
        />
    </Svg>
);

// آیکون ماژیک/قلم - طبق SVG Figma
const PenMarkerSvg: React.FC<{ tipColor: string }> = ({ tipColor }) => (
    <Svg width={104} height={78} viewBox="0 0 104 78" fill="none">
        <Defs>
            <LinearGradient id="paint0_linear" x1="22.0425" y1="34.822" x2="22.0425" y2="40.9346" gradientUnits="userSpaceOnUse">
                <Stop stopColor="#D9D9D9" />
                <Stop offset="0.208607" stopColor="#C4C4C4" />
                <Stop offset="1" stopColor="#737373" />
            </LinearGradient>
            <LinearGradient id="paint1_linear" x1="91.3783" y1="54.5346" x2="67.459" y2="54.5346" gradientUnits="userSpaceOnUse">
                <Stop stopColor="#D9D9D9" />
                <Stop offset="0.208607" stopColor="#C4C4C4" />
                <Stop offset="1" stopColor="#737373" />
            </LinearGradient>
        </Defs>
        {/* نوک قلم */}
        <Path d="M26.9757 35.0283L22.1432 36.3231C20.5522 36.7495 20.5522 39.0071 22.1432 39.4334L26.9757 40.7283C27.3641 40.8324 27.7456 40.5397 27.7456 40.1376L27.7456 35.619C27.7456 35.2169 27.3641 34.9242 26.9757 35.0283Z" fill={tipColor} />
        <Path d="M26.9757 35.0283L22.1432 36.3231C20.5522 36.7495 20.5522 39.0071 22.1432 39.4334L26.9757 40.7283C27.3641 40.8324 27.7456 40.5397 27.7456 40.1376L27.7456 35.619C27.7456 35.2169 27.3641 34.9242 26.9757 35.0283Z" fill="url(#paint0_linear)" fillOpacity={0.6} />
        {/* بدنه قلم */}
        <G>
            <Path
                d="M65.2646 49.8379L130.421 49.8379C130.871 49.8379 131.236 49.4728 131.236 49.0225L131.236 26.93C131.236 26.4797 130.871 26.1147 130.421 26.1147L65.2646 26.1147C64.7316 26.1147 64.2004 26.1761 63.6815 26.2979L27.5593 34.7724C27.1907 34.8589 26.9302 35.1876 26.9302 35.5662L26.9302 40.3863C26.9302 40.7649 27.1907 41.0937 27.5593 41.1802L63.6815 49.6547C64.2004 49.7764 64.7316 49.8379 65.2646 49.8379Z"
                fill="#F3F3F3"
            />
        </G>
        {/* خط رنگی روی بدنه */}
        <Rect x="67.459" y="49.8379" width="23.9193" height="9.39339" transform="rotate(-90 67.459 49.8379)" fill={tipColor} />
        <Rect x="67.459" y="49.8379" width="23.9193" height="9.39339" transform="rotate(-90 67.459 49.8379)" fill="url(#paint1_linear)" fillOpacity={0.6} />
    </Svg>
);

// Color Swatch Component
const ColorSwatch: React.FC<{
    color: string;
    isSelected: boolean;
    onPress: () => void;
}> = ({ color, isSelected, onPress }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.92, { duration: 100, easing: Easing.out(Easing.cubic) });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
    };

    return (
        <View style={styles.swatchContainer}>
            <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <Animated.View style={[styles.colorSwatch, { backgroundColor: color }, animatedStyle]} />
            </Pressable>
            {isSelected && <View style={[styles.selectionIndicator, { backgroundColor: color }]} />}
        </View>
    );
};

// Stroke Size Popup Component
const StrokeSizePopup: React.FC<{
    visible: boolean;
    selectedSize: number;
    onSelectSize: (width: number) => void;
}> = ({ visible, selectedSize, onSelectSize }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(10);
    const scaleAnim = useSharedValue(0.9);

    React.useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
            translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
            scaleAnim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
        } else {
            opacity.value = withTiming(0, { duration: 120 });
            translateY.value = withTiming(8, { duration: 120 });
            scaleAnim.value = withTiming(0.95, { duration: 120 });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }, { scale: scaleAnim.value }],
    }));

    const renderScribbleIcon = (index: number) => {
        switch (index) {
            case 0:
                return <ScribbleIcon1 />;
            case 1:
                return <ScribbleIcon2 />;
            case 2:
                return <ScribbleIcon3 />;
            case 3:
                return <ScribbleIcon4 />;
            default:
                return <ScribbleIcon1 />;
        }
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.strokePopup, animatedStyle]}>
            <View style={styles.strokePopupContent}>
                {STROKE_SIZES.map((size) => (
                    <Pressable
                        key={size.id}
                        style={[styles.strokeSizeItem, selectedSize === size.width && styles.strokeSizeItemActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelectSize(size.width);
                        }}
                    >
                        {renderScribbleIcon(size.index)}
                    </Pressable>
                ))}
            </View>
            <View style={styles.popupArrow} />
        </Animated.View>
    );
};

export interface ToolPenProps extends ImageEditorToolProps {
    selectedColor?: string;
    selectedStrokeWidth?: number;
    onColorChange?: (color: string) => void;
    onStrokeWidthChange?: (width: number) => void;
}

export const ToolPen: React.FC<ToolPenProps> = ({ imageUri, onChange, onApply, onCancel, selectedColor: propSelectedColor, selectedStrokeWidth: propSelectedStrokeWidth, onColorChange, onStrokeWidthChange }) => {
    const [selectedColor, setSelectedColor] = useState(propSelectedColor || PEN_COLORS[0].color);
    const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(propSelectedStrokeWidth || 4);
    const [showStrokePopup, setShowStrokePopup] = useState(false);
    const markerScale = useSharedValue(1);

    const handleColorSelect = (color: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedColor(color);
        onColorChange?.(color);
    };

    const handleStrokeWidthSelect = (width: number) => {
        setSelectedStrokeWidth(width);
        setShowStrokePopup(false);
        onStrokeWidthChange?.(width);
    };

    const handleMarkerPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        markerScale.value = withTiming(0.95, { duration: 80, easing: Easing.out(Easing.cubic) });
        setTimeout(() => {
            markerScale.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) });
        }, 80);
        setShowStrokePopup(!showStrokePopup);
    };

    const markerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: markerScale.value }],
    }));

    return (
        <View style={styles.container}>
            <View style={styles.toolRow}>
                {/* Color Swatches */}
                <View style={styles.colorSwatchesContainer}>
                    {PEN_COLORS.map((penColor) => (
                        <ColorSwatch key={penColor.id} color={penColor.color} isSelected={selectedColor === penColor.color} onPress={() => handleColorSelect(penColor.color)} />
                    ))}
                </View>

                {/* Pen Marker with Stroke Popup */}
                <View style={styles.penMarkerWrapper}>
                    <StrokeSizePopup visible={showStrokePopup} selectedSize={selectedStrokeWidth} onSelectSize={handleStrokeWidthSelect} />
                    <Pressable onPress={handleMarkerPress}>
                        <Animated.View style={[styles.penMarkerContainer, markerAnimatedStyle]}>
                            <PenMarkerSvg tipColor={selectedColor} />
                        </Animated.View>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 40,
    },
    toolRow: {
        flexDirection: "row",
        alignItems: "center",

        justifyContent: "space-between",
    },
    colorSwatchesContainer: {
        paddingLeft: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    swatchContainer: {
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 40,
        position: "relative",
    },
    colorSwatch: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    selectionIndicator: {
        position: "absolute",
        bottom: -4,
        width: 14,
        height: 3.5,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    penMarkerWrapper: {
        position: "relative",
    },
    penMarkerContainer: {
        width: 90,
        height: 50,
        alignItems: "flex-end",
        justifyContent: "center",
        overflow: "hidden",
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    // Stroke Size Popup Styles
    strokePopup: {
        position: "absolute",
        bottom: 58,
        right: 10,
        alignItems: "center",
        zIndex: 100,
    },
    strokePopupContent: {
        flexDirection: "row",
        backgroundColor: colors.system.white,
        borderRadius: 8,
        padding: 4,
        gap: 6,
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    strokeSizeItem: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
    },
    strokeSizeItemActive: {
        backgroundColor: colors.system.gray5,
    },
    popupArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 10,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: colors.system.white,
        marginTop: -1,
    },
});

export default ToolPen;
