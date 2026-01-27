#[cfg(test)]
mod tests {
    use dojo_cairo_test::WorldStorageTestTrait;
    use dojo::model::ModelStorage;
    use dojo::world::WorldStorageTrait;
    use dojo_cairo_test::{spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef};
    use tweetle_dojo::models::player::Player;

    #[test]
    fn test_minimal() {
        let ndef = NamespaceDef {
            namespace: "tweetle_dojo",
            resources: [
                TestResource::Model(tweetle_dojo::models::player::player::TEST_CLASS_HASH),
            ].span(),
        };
        let mut world = spawn_test_world([ndef].span());
        assert(true, 'success');
    }
}