import React, { useRef } from "react";
import AddPracticeMemberForm, { AddPracticeMemberFormRef } from "./form";

export default function AddPracticeMemberRoute() {
    const formRef = useRef<AddPracticeMemberFormRef>(null);

    // This ref will be used by the layout to call submit
    React.useEffect(() => {
        // Store the ref globally so layout can access it
        (global as any).addPracticeMemberFormRef = formRef;
    }, []);

    return <AddPracticeMemberForm ref={formRef} />;
}
