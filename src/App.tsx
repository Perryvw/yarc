export default function() {

    function onClick() {
        alert("bye");
    }

    return (
        <div style={{ backgroundColor: "blue", height: "100%" }}>
            <h1>Hello!</h1>
            <button onClick={onClick}>Press me</button>
        </div>
    )
}